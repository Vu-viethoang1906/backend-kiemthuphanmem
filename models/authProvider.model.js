const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const AuthProviderSchema = new Schema({
_id: { type: String, default: () => uuidv4() },
user_id: { type: String, ref: 'User', required: true, index: true },
provider: { type: String, required: true, maxlength: 50 },
provider_user_id: { type: String, required: true, maxlength: 200 },
}, { collection: 'auth_providers', timestamps: true });


AuthProviderSchema.index({ provider: 1, provider_user_id: 1 }, { name: 'AuthProvider_index_2', unique: true });


const AuthProvider = mongoose.model('AuthProvider', AuthProviderSchema);
module.exports = AuthProvider;
