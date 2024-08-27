const fetch = require('node-fetch');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchUserData(username) {
    try {
        const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${username}`);
        const userData = await userResponse.json();

        if (userData && !userData.error) {
            return {
                name: username,
                lastAccessTime: userData.lastAccessTime || 'N/A',
                online: userData.online || false
            };
        } else {
            return null;
        }
    } catch (err) {
        console.log(err.message);
        return null;
    }
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

            const batchSize = 10; // Number of users to fetch in each batch
            let validUserData = [];

            for (let i = 0; i < usernames.length; i += batchSize) {
                const batchUsernames = usernames.slice(i, i + batchSize);
                const userDataPromises = batchUsernames.map(username => fetchUserData(username));
                const batchUserData = await Promise.all(userDataPromises);
                validUserData.push(...batchUserData.filter(user => user !== null));
                await wait(200); // Optional: Delay between batches
            }

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

            const userData = await fetchUserData(name);

            if (!userData) {
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
        }

    } catch (error) {
        return { statusCode: 500, body: `Error: ${error.message}` };
    }
};
