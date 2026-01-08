const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const ImportJobSchema = new Schema({
_id: { type: String, default: () => uuidv4() },
board_id: { type: String, ref: 'Board', required: true, index: true },
file_name: { type: String, maxlength: 260 },
status: { type: String, maxlength: 20 },
created_by: { type: String, ref: 'User', required: true, index: true },
created_at: { type: Date, default: Date.now },
finished_at: { type: Date },
error_message: { type: String, maxlength: 1000 },
}, { collection: 'import_jobs' });


const ImportJob = mongoose.model('ImportJob', ImportJobSchema);
module.exports = ImportJob;
