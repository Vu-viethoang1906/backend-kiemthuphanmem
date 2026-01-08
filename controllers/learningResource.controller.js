const learningResourceService = require('../services/learningResource.service');
const mongoose = require('mongoose');

class LearningResourceController {
  async create(req, res) {
    try {
      const data = {
        ...req.body,
        created_by: req.user?.id || null,
      };

      const resource = await learningResourceService.createResource(data);

      return res.json({
        status: 'success',
        data: resource,
      });
    } catch (err) {
      console.error('Create Learning Resource Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const resource = await learningResourceService.getResourceById(id);

      if (!resource) {
        return res.status(404).json({ error: 'Learning resource not found' });
      }

      // Track view
      await learningResourceService.trackView(id);

      return res.json({
        status: 'success',
        data: resource,
      });
    } catch (err) {
      console.error('Get Learning Resource Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getAll(req, res) {
    try {
      const { resource_type, skill_id, search, limit = 20, skip = 0 } = req.query;

      const filters = {};
      if (resource_type) filters.resource_type = resource_type;
      if (skill_id) {
        if (mongoose.Types.ObjectId.isValid(skill_id)) {
          filters.skills = skill_id;
        }
      }

      const options = {
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort: { is_featured: -1, view_count: -1, created_at: -1 },
      };

      let resources;
      if (search) {
        resources = await learningResourceService.searchResources(search, parseInt(limit));
      } else {
        resources = await learningResourceService.getAllResources(filters, options);
      }

      return res.json({
        status: 'success',
        data: resources,
        count: resources.length,
      });
    } catch (err) {
      console.error('Get All Learning Resources Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const resource = await learningResourceService.updateResource(id, req.body, req.user?.id);

      return res.json({
        status: 'success',
        data: resource,
      });
    } catch (err) {
      console.error('Update Learning Resource Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await learningResourceService.deleteResource(id);

      return res.json({
        status: 'success',
        message: 'Learning resource deleted successfully',
      });
    } catch (err) {
      console.error('Delete Learning Resource Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  async recommendForTask(req, res) {
    try {
      const { task_id } = req.body;
      const Task = require('../models/task.model');
      const TaskTag = require('../models/taskTag.model');
      const Tag = require('../models/tag.model');

      if (!task_id) {
        return res.status(400).json({ error: 'task_id is required' });
      }

      const task = await Task.findById(task_id)
        .populate('assigned_to', 'username full_name')
        .lean();

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Get task tags
      const taskTags = await TaskTag.find({ task_id: task._id })
        .populate('tag_id', 'name')
        .lean();

      task.tags = taskTags.map(tt => tt.tag_id).filter(Boolean);

      const recommendations = await learningResourceService.recommendResourcesForTask(task, 10);

      return res.json({
        status: 'success',
        data: {
          task_id: task._id,
          task_title: task.title,
          recommendations,
        },
      });
    } catch (err) {
      console.error('Recommend Resources for Task Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LearningResourceController();

