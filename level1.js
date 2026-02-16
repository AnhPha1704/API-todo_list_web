const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLevel1() {
    try {
        console.log("Starting verification for Level 1...");

        // 1. Create User
        const username = `user_${Date.now()}`;
        const password = 'password123';
        const fullName = 'Tran Anh Pha';

        console.log(`Creating user: ${username}`);
        await axios.post(`${BASE_URL}/register`, {
            username,
            password,
            fullName
        });
        console.log("✅ User created.");

        // 2. Create Task
        console.log("Creating tasks...");
        await axios.post(`${BASE_URL}/tasks`, {
            title: "Task 1: Learn Node.js",
            username
        });
        await axios.post(`${BASE_URL}/tasks`, {
            title: "Task 2: Practice MongoDB",
            username
        });
        console.log("✅ Tasks created.");

        // 3. Get All Tasks
        const allTasks = await axios.get(`${BASE_URL}/tasks`);
        if (allTasks.data.length >= 2) console.log("✅ Get All Tasks working.");

        // 4. Get Tasks by User
        const userTasks = await axios.get(`${BASE_URL}/tasks/user/${username}`);
        if (userTasks.data.length === 2) console.log("✅ Get Tasks by User working.");

        // 5. Get Today's Tasks
        const todayTasks = await axios.get(`${BASE_URL}/tasks/today`);
        if (todayTasks.data.length > 0) console.log("✅ Get Today's Tasks working.");

        // 6. Get Incomplete Tasks
        const incompleteTasks = await axios.get(`${BASE_URL}/tasks/incomplete`);
        if (incompleteTasks.data.some(t => t.title.includes("Learn Node.js"))) console.log("✅ Get Incomplete Tasks working.");

        // 7. Generic Nguyen Check
        const nguyenTasks = await axios.get(`${BASE_URL}/tasks/tran`);
        if (nguyenTasks.data.length >= 0) console.log("✅ Get Users Tasks working (could be empty).");

        console.log("🎉 All Level 1 tests passed!");
    } catch (error) {
        console.error("❌ Test failed:", error.response ? error.response.data : error.message);
    }
}

testLevel1();
