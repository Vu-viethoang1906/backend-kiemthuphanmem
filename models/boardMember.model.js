  const mongoose = require('mongoose');
  const { Schema } = mongoose;

const BoardMemberSchema = new mongoose.Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  board_id: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
  role_in_board: { 
    type: String, 
    enum: ["Người tạo", "Thành viên" ,"Người Xem"], 
    default: "Thành viên"
  },
  Creator: {
    type: Boolean,
    default: false
  }
}, { collection: 'BoardMembers', timestamps: true });


  module.exports = mongoose.model('BoardMember', BoardMemberSchema);
