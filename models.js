const mongoose = require('mongoose');

// Schema Người dùng
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'normal'], default: 'normal' } // Level 3: Role
});

// Schema Task
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    isDone: { type: Boolean, default: false }, // True khi TẤT CẢ mọi người đã done
    completedAt: { type: Date, default: null },

    // Level 3: Multi-user assignment
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Người tạo task
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách người được giao
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách người đã xong

    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };