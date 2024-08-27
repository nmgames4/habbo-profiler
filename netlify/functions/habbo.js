const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const path = event.path;

    try {
        // Check if the request is for the /usdf path
        if (path.endsWith('/usdf')) {
            // Fetch the Google Sheet data from the provided JSON endpoint
            const sheetUrl = 'https://script.google.com/macros/s/AKfycbzk8plLG2Vxidu_9HuCqS-OO0y6RUK-k36NHQUyWtOA9jm-vjZkyawnTAq_2x9UWp0olA/exec';
            const sheetResponse = await fetch(sheetUrl);
            const sheetData = await sheetResponse.json();

            const rows = sheetData.GoogleSheetData;
            if (!rows || rows.length <= 4) {
                return { statusCode: 500, body: 'No data found in Google Sheets or not enough rows.' };
            }

            // Skip the first 4 rows (headers) and process only rows 5 and below
            const usernames = rows
                .slice(4) // Start from row 5 (index 4)
                .filter(row => row && row[1]) // Filter out empty rows and rows without usernames
                .map(row => row[1]); // Assuming username is in the second field (index 1)

            // Fetch Habbo data for each valid username
            const userDataPromises = usernames.map(async (username) => {
                const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${username}`);
                const userData = await userResponse.json();

                // Extract necessary fields (name, lastAccessTime, online)
                return {
                    name: username,
                    lastAccessTime: userData.lastAccessTime || 'N/A', // Default to 'N/A' if field not found
                    online: userData.online || false
                };
            });

            const allUserData = await Promise.all(userDataPromises);

            // Build the HTML table
            let table = `<table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Last Access Time</th>
                        <th>Online</th>
                      </tr>
                    </thead>
                    <tbody>`;

            allUserData.forEach(user => {
                table += `<tr>
                    <td>${user.name}</td>
                    <td>${user.lastAccessTime}</td>
                    <td>${user.online ? 'Yes' : 'No'}</td>
                  </tr>`;
            });

            table += `</tbody></table>`;

            // Return the final HTML table
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: `<html><head><title>Habbo USDF Data</title></head><body>${table}</body></html>`
            };

        } else {
            // Handle the /v1/:name case for individual user data
            const name = event.path.split('/').pop(); // Extract the username from the path

            if (!name) {
                return { statusCode: 400, body: 'Please provide a username.' };
            }

            // Fetch data for the specific user
            const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${name}`);
            const userData = await userResponse.json();

            // Build the HTML table for a single user
            let table = `<table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Name</td>
                        <td>${userData.name || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Last Access Time</td>
                        <td>${userData.lastAccessTime || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Online</td>
                        <td>${userData.online ? 'Yes' : 'No'}</td>
                      </tr>
                    </tbody>
                  </table>`;

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
