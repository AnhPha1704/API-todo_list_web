const mongoose = require('mongoose');
const { User, Task } = require('./models');
const bcrypt = require('bcrypt');

async function setupLevel3() {
    try {
        await mongoose.connect('mongodb://admin:12345678@localhost:27017/todo_app?authSource=admin');
        console.log("Connected to DB...");

        // 1. Clear old data (Optional? Yes, for clean test)
        await Task.deleteMany({});
        await User.deleteMany({});
        console.log("Cleared old data.");

        // 2. Create Users
        const passwordHash = await bcrypt.hash('123456', 10);

        const admin = new User({
            username: 'admin',
            password: passwordHash,
            fullName: 'Admin User',
            role: 'admin'
        });

        const userA = new User({
            username: 'user_a',
            password: passwordHash,
            fullName: 'User A',
            role: 'normal'
        });

        const userB = new User({
            username: 'user_b',
            password: passwordHash,
            fullName: 'User B',
            role: 'normal'
        });

        await Promise.all([admin.save(), userA.save(), userB.save()]);
        console.log("Created users: admin, user_a, user_b");

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setupLevel3();
