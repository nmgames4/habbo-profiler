const fetch = require('node-fetch');

// Utility function to create a delay
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.handler = async (event, context) => {
    const path = event.path;

    try {
        if (path.endsWith('/usdf')) {
            // Handle the /usdf path to fetch data from Google Sheets and Habbo API

            const sheetUrl = 'https://script.google.com/macros/s/AKfycbzk8plLG2Vxidu_9HuCqS-OO0y6RUK-k36NHQUyWtOA9jm-vjZkyawnTAq_2x9UWp0olA/exec';
            const sheetResponse = await fetch(sheetUrl);
            const sheetData = await sheetResponse.json();

            const rows = sheetData.GoogleSheetData;
            if (!rows || rows.length <= 4) {
                return { statusCode: 500, body: 'No data found in Google Sheets or not enough rows.' };
            }

            // Extract usernames from the Google Sheets data
            const usernames = rows
                .slice(4) // Skip first 4 rows
                .filter(row => row && row[1]) // Filter out empty rows
                .map(row => row[1]); // Extract username from the second column (index 1)

            // Fetch Habbo data for each username
            const userDataPromises = usernames.map((username, index) =>
                new Promise(async (resolve) => {
                    try {
                        await wait(index * 500); // Stagger requests by 500ms
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

            // Build the HTML table
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
            // Handle the /v1/:name path for individual user lookup
            const name = path.split('/').pop(); // Extract username from the path

            if (!name) {
                return { statusCode: 400, body: 'Please provide a username.' };
            }

            try {
                const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${name}`);
                const userData = await userResponse.json();

                if (!userData || userData.error) {
                    return { statusCode: 500, body: 'Invalid username or API error.' };
                }

                // Build the HTML table for individual user data
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
