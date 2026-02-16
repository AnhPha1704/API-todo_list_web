const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User, Task } = require('./models'); // Đảm bảo file models.js của bạn nằm cùng thư mục

const app = express();

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware để đọc được dữ liệu JSON từ request body
app.use(express.json());

// 1. Kết nối MongoDB (Thay đổi link nếu bạn dùng Atlas hoặc port khác)
// Cấu trúc: mongodb://username:password@localhost:27017/DatabaseName?authSource=admin
mongoose.connect('mongodb://admin:12345678@localhost:27017/todo_app?authSource=admin')
    .then(() => console.log("Connected to MongoDB with Auth..."))
    .catch(err => console.error("Could not connect to MongoDB:", err));

// 2. API Đăng ký (Level 1: Mã hóa password)cks
app.post('/register', async (req, res) => {
    try {
        const { username, password, fullName } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            fullName
        });

        await newUser.save();
        res.status(201).json({ message: "User created!" });
    } catch (err) {
        res.status(400).json({ error: "Username đã tồn tại hoặc dữ liệu sai!" });
    }
});

// 3. API Lấy tất cả các task
app.get('/tasks', async (req, res) => {
    const tasks = await Task.find().populate('userId', 'fullName');
    res.json(tasks);
});

// 6. API Tạo Task (Input: title, username)
// 6. API Tạo Task (Level 3: Multi-assign)
app.post('/tasks', async (req, res) => {
    try {
        const { title, username, assignees } = req.body; // assignees: string "user1, user2"

        // 1. Xác định người tạo (Creator)
        const creator = await User.findOne({ username });
        if (!creator) return res.status(404).json({ error: "Người tạo không tồn tại!" });

        // 2. Xác định danh sách người được giao (Assignees)
        let assignedUserIds = [];

        if (assignees && assignees.trim()) {
            // Nếu có nhập danh sách người được giao
            const assigneeNames = assignees.split(',').map(name => name.trim());

            // Logic Level 3: Check Role
            if (creator.role !== 'admin' && assigneeNames.some(name => name !== creator.username)) {
                return res.status(403).json({ error: "Chỉ Admin mới được giao việc cho người khác!" });
            }

            // Tìm user theo username HOẶC fullName
            const foundAssignees = await User.find({
                $or: [
                    { username: { $in: assigneeNames } },
                    { fullName: { $in: assigneeNames } }
                ]
            });
            assignedUserIds = foundAssignees.map(u => u._id);
        } else {
            // Mặc định giao cho chính mình
            assignedUserIds = [creator._id];
        }

        const newTask = new Task({
            title,
            creatorId: creator._id,
            assignedTo: assignedUserIds,
            completedBy: []
        });

        await newTask.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Lấy task theo username
app.get('/tasks/user/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found!" });
        }

        const tasks = await Task.find({ userId: user._id });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Xuất các task trong ngày hiện tại
app.get('/tasks/today', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).populate('userId', 'username');

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Xuất các task chưa hoàn thành
app.get('/tasks/incomplete', async (req, res) => {
    try {
        const tasks = await Task.find({ isDone: false }).populate('userId', 'username');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Xuất các task với những user có họ là 'Nguyễn'
// 4. Xuất các task với những user có họ (hoặc tên) khớp với từ khóa
app.get('/tasks/:name', async (req, res) => {
    try {
        const { name } = req.params;
        // Kiểm tra tránh conflict với các keyword khác nếu lỡ define sai thứ tự (dù hiện tại thứ tự đã đúng)
        if (['today', 'incomplete'].includes(name.toLowerCase())) {
            // Nếu code chạy vào đây nghĩa là route today/incomplete chưa bắt được, 
            // nhưng vì thứ tự define ở trên nên chắc chắn không vào đây. 
            // Tuy nhiên, logic này handle cho trường hợp tổng quát.
            return res.status(404).json({ error: "Invalid parameter" });
        }

        // Tìm các user có họ/tên bắt đầu bằng từ khóa (không phân biệt hoa thường)
        const regex = new RegExp(`^${name}`, 'i');
        const users = await User.find({ fullName: { $regex: regex } });
        const userIds = users.map(u => u._id);

        const tasks = await Task.find({ userId: { $in: userIds } }).populate('userId');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Level 2 & 3: Web Interface Route
app.get('/', async (req, res) => {
    try {
        const users = await User.find(); // Lấy list users để làm dropdown "Login"
        // Lấy tất cả tasks để hiển thị (Level 3 sẽ filter ở client hoặc server sau, 
        // nhưng để đơn giản ta lấy hết rồi filter view hoặc cải tiến sau)
        // Level 3: Populate cả creator và assignedTo
        const tasks = await Task.find()
            .populate('creatorId', 'fullName')
            .populate('assignedTo', 'username fullName') // Lấy username để hiện
            .populate('completedBy', 'username');

        res.render('index', { tasks, users });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error: " + err.message);
    }
});

// Update Task (Toggle Done) - Level 3 Logic
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { activeUser } = req.body; // Username của người đang thao tác

        const user = await User.findOne({ username: activeUser });
        if (!user) return res.status(404).json({ error: "User không tồn tại" });

        const task = await Task.findById(id);
        if (!task) return res.status(404).json({ error: "Task không tồn tại" });

        // Check if user is assigned
        if (!task.assignedTo.includes(user._id)) {
            return res.status(403).json({ error: "Bạn không được giao task này!" });
        }

        // Toggle status in completedBy
        const completedIndex = task.completedBy.indexOf(user._id);
        if (completedIndex > -1) {
            task.completedBy.splice(completedIndex, 1); // Uncheck
        } else {
            task.completedBy.push(user._id); // Check
        }

        // Check if all assignees completed
        // Convert to string to compare ObjectIds easily
        const allAssigned = task.assignedTo.map(id => id.toString());
        const allCompleted = task.completedBy.map(id => id.toString());

        const isAllDone = allAssigned.every(id => allCompleted.includes(id));
        task.isDone = isAllDone;

        if (isAllDone) {
            task.completedAt = new Date();
        } else {
            task.completedAt = null;
        }

        await task.save();
        res.json(task);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Task
app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Task.findByIdAndDelete(id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Khởi chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});