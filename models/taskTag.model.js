const mongoose = require('mongoose');

const TaskTagSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  tag_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag', required: true }
}, { 
  collection: 'TaskTags',
  timestamps: true 
});

TaskTagSchema.index({ task_id: 1, tag_id: 1 }, { name: 'TaskTag_index_8', unique: true });

module.exports = mongoose.model('TaskTag', TaskTagSchema);

