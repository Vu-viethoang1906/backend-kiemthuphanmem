const centerMemberService = require('../services/centerMember.service');

class CenterMemberController {
  async addMember(req, res) {
    try {
      const { center_id, user_id, role_in_center } = req.body;
      const result = await centerMemberService.addMember(center_id, user_id, role_in_center);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getCentersByUser(req, res) {
    try {
      const user_id = req.user?.id || req.user?._id;
      const data = await centerMemberService.getCentersByUser(user_id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getMembersByCenter(req, res) {
    try {
      const { center_id } = req.params;
      const data = await centerMemberService.getMembersByCenter(center_id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async removeMember(req, res) {
    try {
      const { id } = req.params;
      await centerMemberService.removeMember(id);
      res.json({ success: true, message: "Xóa thành viên thành công" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
    async getAll(req, res) {
    try {
     const data =  await centerMemberService.getAll();
         res.json({ success: true, data });
    } catch (error) {
      
    }
    }

}

module.exports = new CenterMemberController();
