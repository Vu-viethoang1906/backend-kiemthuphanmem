const learningResourceRepo = require('../repositories/learningResource.repository');
const mongoose = require('mongoose');

class LearningResourceService {
  async createResource(data) {
    return await learningResourceRepo.create(data);
  }

  async getResourceById(id) {
    return await learningResourceRepo.findById(id);
  }

  async getAllResources(filters = {}, options = {}) {
    return await learningResourceRepo.find(filters, options);
  }

  async updateResource(id, data, userId) {
    // Check if user has permission (optional: add role check)
    const existing = await learningResourceRepo.findById(id);
    if (!existing) {
      throw new Error('Learning resource not found');
    }

    return await learningResourceRepo.update(id, data);
  }

  async deleteResource(id) {
    return await learningResourceRepo.delete(id);
  }

  async searchResources(keywords, limit = 10) {
    return await learningResourceRepo.searchByKeywords(keywords, limit);
  }

  async getResourcesBySkills(skillIds, limit = 10) {
    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return [];
    }

    const validIds = skillIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return [];
    }

    return await learningResourceRepo.findBySkills(validIds, limit);
  }

  async getResourcesByType(resourceType, limit = 10) {
    return await learningResourceRepo.findByResourceType(resourceType, limit);
  }

  async recommendResourcesForTask(task, limit = 10) {
    const recommendations = {
      tutorials: [],
      videos: [],
      codeExamples: [],
    };

    // Extract keywords from task
    const keywords = [];
    if (task.title) keywords.push(...task.title.split(/\s+/));
    if (task.description) keywords.push(...task.description.split(/\s+/));
    if (task.tags && Array.isArray(task.tags)) {
      // If tags are objects, extract names
      task.tags.forEach(tag => {
        if (typeof tag === 'string') {
          keywords.push(tag);
        } else if (tag.name) {
          keywords.push(tag.name);
        }
      });
    }

    // Search by keywords
    const keywordResults = await learningResourceRepo.searchByKeywords(keywords, limit * 2);

    // Categorize results
    keywordResults.forEach(resource => {
      if (resource.resource_type === 'tutorial' || resource.resource_type === 'article' || resource.resource_type === 'docs' || resource.resource_type === 'blog') {
        if (recommendations.tutorials.length < limit) {
          recommendations.tutorials.push(resource);
        }
      } else if (resource.resource_type === 'video' || resource.resource_type === 'course') {
        if (recommendations.videos.length < limit) {
          recommendations.videos.push(resource);
        }
      } else if (resource.resource_type === 'code_example') {
        if (recommendations.codeExamples.length < limit) {
          recommendations.codeExamples.push(resource);
        }
      }
    });

    // If not enough results, try to get by resource type
    if (recommendations.tutorials.length < limit) {
      const tutorials = await learningResourceRepo.findByResourceType('tutorial', limit - recommendations.tutorials.length);
      recommendations.tutorials.push(...tutorials.filter(t => !recommendations.tutorials.find(existing => existing._id.toString() === t._id.toString())));
    }

    if (recommendations.videos.length < limit) {
      const videos = await learningResourceRepo.findByResourceType('video', limit - recommendations.videos.length);
      recommendations.videos.push(...videos.filter(v => !recommendations.videos.find(existing => existing._id.toString() === v._id.toString())));
    }

    if (recommendations.codeExamples.length < limit) {
      const codeExamples = await learningResourceRepo.findByResourceType('code_example', limit - recommendations.codeExamples.length);
      recommendations.codeExamples.push(...codeExamples.filter(c => !recommendations.codeExamples.find(existing => existing._id.toString() === c._id.toString())));
    }

    return recommendations;
  }

  async trackView(resourceId) {
    return await learningResourceRepo.incrementViewCount(resourceId);
  }
}

module.exports = new LearningResourceService();

