const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Get the name from the query string
    const name = event.queryStringParameters.name;
    if (!name) {
        return {
            statusCode: 400,
            body: 'Please provide a username.'
        };
    }

    // Fetch data from Habbo API
    const apiUrl = `https://www.habbo.com/api/public/users?name=${name}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('User not found');
        }
        const data = await response.json();

        // Generate HTML table
        const tableRows = Object.entries(data)
            .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
            .join('');
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Habbo Profiler</title>
            </head>
            <body>
                <h1>Habbo Profiler - ${name}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: html
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: error.toString()
        };
    }
};