const CenterMember = require('../models/centerMember.model');

class CenterMemberRepo {
  async create(data) {
    return await CenterMember.create(data);
  }

  async findByUserId(user_id) {
    return await CenterMember.find({ user_id })
      .populate('center_id', 'name description location created_at')
      .lean();
  }

  async findByCenterId(center_id) {
    return await CenterMember.find({ center_id })
      .populate('user_id', 'username email roles')
      .lean();
  }

  async findById(id) {
    return await CenterMember.findById(id).lean();
  }

  async delete(id) {
    return await CenterMember.findByIdAndDelete(id);
  }

  async isMember(center_id, user_id) {
    return await CenterMember.exists({ center_id, user_id });
  }

 async softDelete( user_id ) {
    return await CenterMember.updateMany(
      { user_id, deleted: false },
    { $set: { deleted: true, updatedAt: new Date() } }
    );
  }
  
 async findAll( ) {
 return await CenterMember.find();
}
}
module.exports = new CenterMemberRepo();
