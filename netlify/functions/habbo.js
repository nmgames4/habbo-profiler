const fetch = require('node-fetch');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
                try {
                    const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${username}`);
                    const userData = await userResponse.json();

                    // Ensure that the response is JSON
                    if (typeof userData === 'object' && !userData.error) {
                        return {
                            name: username,
                            lastAccessTime: userData.lastAccessTime || 'N/A', // Default to 'N/A' if field not found
                            online: userData.online || 'N/A'
                        };
                    } else {
                        return null; // Return null if the response is invalid
                    }
                } catch (err) {
                    return console.log(err);
                } finally {
                    await wait(500);
                }
            });

            const allUserData = await Promise.all(userDataPromises);

            // Filter out any null results (invalid responses)
            const validUserData = allUserData.filter(user => user !== null);

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

            // Return the final HTML table for USDF members
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

            try {
                // Fetch data for the specific user
                const userResponse = await fetch(`https://www.habbo.com/api/public/users?name=${name}`);
                const userData = await userResponse.json();

                // Ensure the response is valid JSON and not an error page
                if (typeof userData !== 'object' || userData.error) {
                    return { statusCode: 500, body: 'Invalid username or API error.' };
                }

                // Build the HTML table for the individual user lookup (FIELD | VALUE)
                let table = `<table border="1" cellpadding="5" cellspacing="0">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>`;

                // Loop through the userData object and create rows for each field
                Object.keys(userData).forEach(field => {
                    table += `<tr>
                      <td>${field}</td>
                      <td>${userData[field] !== null ? userData[field] : 'N/A'}</td>
                    </tr>`;
                });

                table += `</tbody></table>`;

                // Return the final HTML table for individual lookup
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'text/html' },
                    body: `<html><head><title>Habbo User Data</title></head><body>${table}</body></html>`
                };

            } catch (err) {
                // Handle any errors with the API request
                return { statusCode: 500, body: `Error: ${err.message}` };
            }
        }

    } catch (error) {
        return { statusCode: 500, body: `Error: ${error.message}` };
    }
};