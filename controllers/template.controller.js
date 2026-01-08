const templateService = require('../services/template.service');
const queryParser = require('../utils/queryParser');

class TemplateController {
  async create(req, res) {
    try {
      const user = req.user; // user từ token
      const { name, description } = req.body;
      const tpl = await templateService.createTemplate({ name, description, userId: user.id });
      res.status(201).json({ success: true, data: tpl });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async list(req, res) {
    try {
      const user = req.user;

      // Parse query params
      const parsed = queryParser.parseQuery(req.query, {
        allowedFilters: ['created_by'],
        allowedSortFields: ['created_at', 'updated_at', 'name'],
        maxLimit: 100,
        defaults: {
          page: 1,
          limit: 10,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      });

      // Get templates from service
      const result = await templateService.listTemplates(user.id, {
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
        result.templates,
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
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const tpl = await templateService.getTemplateById(req.params.id);
      res.json({ success: true, data: tpl });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async update(req, res) {
    try {
      const user = req.user;
      const updated = await templateService.updateTemplate(req.params.id, req.body, user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async remove(req, res) {
    try {
      const user = req.user;
      await templateService.deleteTemplate(req.params.id, user);
      res.json({ success: true, message: 'Xóa template thành công' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new TemplateController();
