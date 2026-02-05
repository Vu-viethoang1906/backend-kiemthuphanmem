const centerService = require('../services/center.service');
const queryParser = require('../utils/queryParser');

// Lấy tất cả với deep linking
exports.getAllCenters = async (req, res) => {
  try {
    // Parse query params
    const parsed = queryParser.parseQuery(req.query, {
      allowedFilters: ['status'],
      allowedSortFields: ['createdAt', 'updatedAt', 'name'],
      maxLimit: 100,
      defaults: {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    });

    // Get centers from service
    const result = await centerService.viewAll({
      page: parsed.pagination.page,
      limit: parsed.pagination.limit,
      sortBy: parsed.metadata.sortBy,
      sortOrder: parsed.metadata.sortOrder,
      filter: parsed.filter,
      search: parsed.search
    });

    // Build deep link response
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
    const response = queryParser.buildDeepLinkResponse(
      result.centers,
      req.query,
      baseUrl,
      {
        page: parsed.pagination.page,
        limit: parsed.pagination.limit,
        total: result.pagination.total
      },
      {
        filtersApplied: parsed.metadata.filtersApplied,
        search: parsed.search,
        viewState: parsed.viewState
      }
    );

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy theo ID
exports.getCenterById = async (req, res) => {
  try {
    const center = await centerService.getById(req.params.id);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo mới
exports.createCenter = async (req, res) => {
  try {
    const center = await centerService.createCenter(req.body);
    res.status(201).json(center);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Cập nhật
exports.updateCenter = async (req, res) => {
  try {
    const center = await centerService.updateCenter(req.params.id, req.body);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json(center);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Xóa
exports.deleteCenter = async (req, res) => {
  try {
    const center = await centerService.deleteCenter(req.params.id);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy các bảng của một thành viên trong center
exports.getMemberBoards = async (req, res) => {
  try {
    console.log('[center.controller] getMemberBoards called, body:', req.body);
    const { idUser, idCenter } = req.body || {};
    if (!idUser) return res.status(400).json({ message: 'Missing idUser' });
    if (!idCenter) return res.status(400).json({ message: 'Missing idCenter' });
    
    const boards = await centerService.viewMemberBoards(idUser, idCenter);
    console.log('[center.controller] getMemberBoards result count:', Array.isArray(boards) ? boards.length : 0);
    return res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    console.error('Error getting member boards:', error);
    return res.status(400).json({ 
      success: false,
      message: `Error getting member boards: ${error.message}` 
    });
  }
};
