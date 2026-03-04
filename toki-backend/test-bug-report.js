const jwt = require('jsonwebtoken');

async function testReport() {
    try {
        const token = jwt.sign(
            { id: '12345test', email: 'test@example.com', name: 'Test User' },
            'your-super-secret-jwt-key-change-this-in-production',
            { expiresIn: '1h' }
        );

        const response = await fetch('http://localhost:3002/api/bug-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Bug Report via API',
                description: 'Testing the Trello integration after adding keys.',
                category: 'Other',
                severity: 'Medium',
                steps: '1. Ran script\n2. Checked Trello'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testReport();
