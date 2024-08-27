const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const path = event.path;

    // Helper function to wait for a specified duration (in milliseconds)
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    try {
        if (path.endsWith('/usdf')) {
            const sheetUrl = 'https://script.google.com/macros/s/AKfycbzk8plLG2Vxidu_9HuCqS-OO0y6RUK-k36NHQUyWtOA9jm-vjZkyawnTAq_2x9UWp0olA/exec';
            const sheetResponse = await fetch(sheetUrl);
            const sheetData = await sheetResponse.json();

            const rows = sheetData.GoogleSheetData;
            if (!rows || rows.length <= 4) {
                return { statusCode: 500, body: 'No data found in Google Sheets or not enough rows.' };
            }

            const usernames = rows
                .slice(4) // Start from row 5 (index 4)
                .filter(row => row && row[1]) // Filter out empty rows and rows without usernames
                .map(row => row[1]);

            let validUserData = [];
            let statusMessages = [];

            for (let username of usernames) {
                try {
                    const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${username}`);

                    // Log the status code and URL for each request
                    statusMessages.push(`Request for ${username}: Status Code ${userResponse.status}`);

                    if (userResponse.status === 200) {
                        const userData = await userResponse.json();
                        if (typeof userData === 'object' && !userData.error) {
                            validUserData.push({
                                name: username,
                                lastAccessTime: userData.lastAccessTime || 'N/A',
                                online: userData.online || false
                            });
                        } else {
                            statusMessages.push(`Error: Invalid JSON response for ${username}`);
                        }
                    } else {
                        statusMessages.push(`Error: ${userResponse.statusText} for ${username}`);
                    }

                } catch (error) {
                    statusMessages.push(`Error: ${error.message} for ${username}`);
                }

                // Wait 0.5 seconds between each request
                await wait(1);
            }

            // Build the HTML table for USDF lookup
            let table = `<table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Last Access Time</th>
                        <th>Online</th>
                      </tr>
                    </thead>
                    <tbody>`;

            validUserData.forEach(user => {
                table += `<tr>
                    <td>${user.name}</td>
                    <td>${user.lastAccessTime}</td>
                    <td>${user.online ? 'Yes' : 'No'}</td>
                  </tr>`;
            });

            table += `</tbody></table>`;

            // Append the status messages at the bottom
            let statusLog = `<h3>Status Log</h3><ul>`;
            statusMessages.forEach(msg => {
                statusLog += `<li>${msg}</li>`;
            });
            statusLog += `</ul>`;

            // Return the final HTML
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: `<html>
                <head><title>Habbo USDF Data</title></head>
                <body>
                  ${table}
                  ${statusLog}
                </body>
              </html>`
            };

        } else {
            const name = event.path.split('/').pop();

            if (!name) {
                return { statusCode: 400, body: 'Please provide a username.' };
            }

            try {
                const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${name}`);
                const userData = await userResponse.json();

                if (typeof userData !== 'object' || userData.error) {
                    return { statusCode: 500, body: 'Invalid username or API error.' };
                }

                let table = `<table border="1" cellpadding="5" cellspacing="0">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>`;

                Object.keys(userData).forEach(field => {
                    table += `<tr>
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
