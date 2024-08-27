const fetch = require('node-fetch');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.handler = async (event, context) => {
    const path = event.path;

    try {
        if (path.endsWith('/usdf')) {
            const sheetUrl = 'https://script.google.com/macros/s/AKfycbzk8plLG2Vxidu_9HuCqS-OO0y6RUK-k36NHQUyWtOA9jm-vjZkyawnTAq_2x9UWp0olA/exec';
            const sheetResponse = await fetch(sheetUrl);
            const sheetData = await sheetResponse.json();

            const rows = sheetData.GoogleSheetData;
            if (!rows || rows.length <= 4) {
                return { statusCode: 500, body: 'No data found in Google Sheets or not enough rows.' };
            }

            const usernames = rows.slice(4)
                .filter(row => row && row[1])
                .map(row => row[1]);

            const userDataPromises = usernames.map((username, index) =>
                new Promise(async (resolve) => {
                    try {
                        await wait(index * 200); // Reduced stagger time to 200ms
                        const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${username}`);
                        const userData = await userResponse.json();

                        if (userData && !userData.error) {
                            resolve({
                                name: username,
                                lastAccessTime: userData.lastAccessTime || 'N/A',
                                online: userData.online || false
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (err) {
                        console.log(err.message);
                        resolve(null);
                    }
                })
            );

            const allUserData = await Promise.all(userDataPromises);
            const validUserData = allUserData.filter(user => user !== null);

            let table = `
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Last Access Time</th>
                            <th>Online</th>
                        </tr>
                    </thead>
                    <tbody>`;

            validUserData.forEach(user => {
                table += `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.lastAccessTime}</td>
                        <td>${user.online ? 'Yes' : 'No'}</td>
                    </tr>`;
            });

            table += `</tbody></table>`;

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: `<html><head><title>Habbo USDF Data</title></head><body>${table}</body></html>`
            };

        } else {
            const name = path.split('/').pop();

            if (!name) {
                return { statusCode: 400, body: 'Please provide a username.' };
            }

            try {
                const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${name}`);
                const userData = await userResponse.json();

                if (!userData || userData.error) {
                    return { statusCode: 500, body: 'Invalid username or API error.' };
                }

                let table = `
                    <table border="1" cellpadding="5" cellspacing="0">
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>`;

                Object.keys(userData).forEach(field => {
                    table += `
                        <tr>
                            <td>${field}</td>
                            <td>${userData[field] !== null ? userData[field] : 'N/A'}</td>
                        </tr>`;
                });

                table += `</tbody></table>`;

                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/html' },
                    body: `<html><head><title>Habbo User Data</title></head><body>${table}</body></html>`
                };

            } catch (err) {
                return { statusCode: 500, body: `Error: ${err.message}` };
            }
        }

    } catch (error) {
        return { statusCode: 500, body: `Error: ${error.message}` };
    }
};
