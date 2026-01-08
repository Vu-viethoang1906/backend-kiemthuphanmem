# 📚 Tài Liệu Nghiệp Vụ: Adaptive Gamification System

## 🎯 Mục Đích

Hệ thống Adaptive Gamification là một tính năng thông minh giúp **tăng động lực học tập** của học viên bằng cách:

- **Phân tích hành vi** của từng học viên để hiểu họ thích cạnh tranh hay cộng tác, thích mục tiêu ngắn hạn hay dài hạn
- **Tự động điều chỉnh** các phần thưởng (điểm, huy hiệu) phù hợp với sở thích của từng người
- **Đề xuất huy hiệu** mà học viên có khả năng quan tâm nhất

Ví dụ: Nếu học viên A thích cạnh tranh, hệ thống sẽ tăng điểm thưởng cho các huy hiệu cạnh tranh và hiển thị chúng trước. Nếu học viên B thích cộng tác, hệ thống sẽ làm ngược lại.

---

## 🔄 Luồng Hoạt Động

### Bước 1: Thu Thập Dữ Liệu
Khi học viên sử dụng hệ thống, mọi hành động đều được ghi lại:
- Xem bảng xếp hạng
- Xem điểm số
- Hoàn thành task
- Nhận huy hiệu
- Phản ứng với các yếu tố gamification

### Bước 2: Phân Tích (AI)
Sau khi có đủ dữ liệu (khoảng 7-30 ngày), AI sẽ phân tích và đưa ra:
- **Motivation Profile**: Học viên này thích gì? (cạnh tranh/cộng tác, ngắn hạn/dài hạn)
- **Confidence Score**: Độ tin cậy của phân tích (0-100)
- **Onboarding Stage**: Học viên đang ở giai đoạn nào?

### Bước 3: Cá Nhân Hóa
Dựa trên Motivation Profile, hệ thống sẽ:
- Điều chỉnh hệ số nhân điểm thưởng (multipliers)
- Đề xuất loại huy hiệu phù hợp
- Sắp xếp huy hiệu theo mức độ quan tâm

### Bước 4: Áp Dụng
Khi học viên hoàn thành task hoặc nhận huy hiệu, hệ thống tự động:
- Tính điểm thưởng với multiplier phù hợp
- Award huy hiệu nếu đủ điều kiện
- Cập nhật lại phân tích nếu cần

---

## 📊 Các Giai Đoạn (Onboarding Stages)

Hệ thống theo dõi học viên qua các giai đoạn:

1. **AWAITING_INITIAL_DATA** (Chờ dữ liệu ban đầu)
   - Học viên mới, chưa có đủ dữ liệu
   - Confidence < 30
   - Hệ thống dùng chiến lược "đồng đều" (tất cả multipliers = 1.0)

2. **TESTING_COMPETITIVE** (Đang thử nghiệm cạnh tranh)
   - Confidence 30-60, có dấu hiệu thích cạnh tranh
   - Hệ thống tăng multipliers cho badges cạnh tranh

3. **TESTING_COLLABORATIVE** (Đang thử nghiệm cộng tác)
   - Confidence 30-60, có dấu hiệu thích cộng tác
   - Hệ thống tăng multipliers cho badges cộng tác

4. **TESTING_SHORT_TERM** / **TESTING_LONG_TERM**
   - Đang thử nghiệm với mục tiêu ngắn/dài hạn

5. **STABLE** (Ổn định)
   - Confidence >= 60
   - Đã xác định rõ sở thích của học viên
   - Hệ thống áp dụng chiến lược tối ưu

---

## 🎮 Chiến Lược AI (Strategies)

Hệ thống tự động chọn chiến lược dựa trên Motivation Profile:

- **UNIFORM_PUSH**: Đẩy đều tất cả (khi chưa có đủ dữ liệu)
- **COMPETITIVE_FOCUS**: Tập trung vào cạnh tranh
- **COLLABORATIVE_FOCUS**: Tập trung vào cộng tác
- **SHORT_TERM_FOCUS**: Tập trung vào mục tiêu ngắn hạn
- **LONG_TERM_FOCUS**: Tập trung vào mục tiêu dài hạn
- **BALANCED**: Cân bằng

---

## 🔌 API Endpoints

### 1. 📊 Dashboard - API Chính (QUAN TRỌNG NHẤT)

**GET** `/api/adaptive-gamification`

Đây là API **quan trọng nhất**, trả về tất cả thông tin cần thiết cho frontend.

**Query Parameters:**
- `center_id` (optional): ID của center. Nếu không có, hệ thống tự động lấy center của user
- `days` (optional, default: 30): Số ngày để tính behavior stats
- `recent_limit` (optional, default: 10): Số lượng recent badges muốn lấy

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "user_id": "...",
    "center_id": "...",
    
    // Motivation Profile - Hồ sơ động lực của học viên
    "motivation_profile": {
      "competitive_score": 50,        // Điểm cạnh tranh (0-100)
      "collaborative_score": 50,       // Điểm cộng tác (0-100)
      "short_term_score": 50,          // Điểm mục tiêu ngắn hạn (0-100)
      "long_term_score": 50,           // Điểm mục tiêu dài hạn (0-100)
      "confidence": 0,                  // Độ tin cậy phân tích (0-100)
      "onboarding_stage": "AWAITING_INITIAL_DATA",  // Giai đoạn hiện tại
      "insights": ["Không đủ dữ liệu để phân tích"],  // Các insight từ AI
      "recommendations": ["Cần thu thập thêm dữ liệu hành vi"],  // Đề xuất
      "last_updated": "2025-12-08T03:32:11.190Z"
    },
    
    // Personalization - Cấu hình cá nhân hóa
    "personalization": {
      "current_strategy": "UNIFORM_PUSH",  // Chiến lược AI đang dùng
      "leaderboard_weight": 0.5,          // Trọng số bảng xếp hạng
      "badges_weight": 0.5,                // Trọng số huy hiệu
      "points_weight": 1.0,                // Trọng số điểm
      "goals_weight": 0.5,                 // Trọng số mục tiêu
      "recommended_badge_categories": ["competitive"],  // Loại huy hiệu nên ưu tiên
      "reward_multipliers": {              // Hệ số nhân điểm thưởng
        "competitive": 1.2,                // Huy hiệu cạnh tranh x1.2
        "collaborative": 1.0,
        "short_term": 1.1,
        "long_term": 1.0
      },
      "personalized_messages": [],         // Tin nhắn cá nhân hóa
      "last_adaptation_date": "2025-12-08T03:32:11.190Z",  // Lần điều chỉnh cuối
      "skip_reason": null                  // Lý do skip (nếu có, thường là "Cooldown period active")
    },
    
    // My Badges - Huy hiệu của học viên
    "my_badges": {
      "total": 2,
      "badges": [
        {
          "_id": "...",
          "name": "First Task",
          "description": "Hoàn thành task đầu tiên",
          "icon_url": "...",
          "category": "achievement",
          "earned_at": "2025-12-08T03:32:11.190Z",
          "metadata": {}
        }
      ]
    },
    
    // Recent Badges - Huy hiệu gần đây trong center
    "recent_badges": {
      "total": 5,
      "badges": [
        {
          "user": {
            "_id": "...",
            "username": "john_doe",
            "full_name": "John Doe"
          },
          "badge": {
            "_id": "...",
            "name": "Task Master",
            "icon_url": "...",
            "category": "achievement"
          },
          "earned_at": "2025-12-08T03:32:11.190Z"
        }
      ]
    },
    
    // Behavior - Thống kê hành vi
    "behavior": {
      "stats": {
        "total_events": 50,
        "action_counts": {
          "view_leaderboard": 10,
          "complete_task": 5,
          "earn_badge": 2
        },
        "leaderboard_views": 10,
        "task_completions": 5
      },
      "analytics": {
        "total_events": 50,
        "period_days": 30
      },
      "period_days": 30
    },
    
    // Available Badges - Tất cả huy hiệu có sẵn
    "available_badges": {
      "total": 7,
      "badges": [
        {
          "_id": "...",
          "name": "First Task",
          "description": "Hoàn thành task đầu tiên",
          "category": "achievement",
          "criteria": { "type": "task_count", "value": 1 },
          "points_reward": 10,
          "icon_url": "..."
        }
      ]
    },
    
    // Personalized Badges - Huy hiệu đã được AI personalize
    "personalized_badges": {
      "total": 7,
      "recommended": [  // Các huy hiệu được AI recommend
        {
          "_id": "...",
          "name": "Top Performer",
          "category": "competitive",
          "points_reward": 100,
          "adjusted_points_reward": 120,  // Đã nhân với multiplier
          "is_recommended": true,
          "priority": 1,                   // Ưu tiên hiển thị
          "multiplier_applied": 1.2
        }
      ],
      "badges": [  // Tất cả badges, đã sắp xếp theo priority
        // ... (tương tự như trên)
      ]
    }
  }
}
```

**Cách Sử Dụng:**
- Gọi API này khi user vào trang Dashboard/Gamification
- Hiển thị Motivation Profile để user biết họ đang ở giai đoạn nào
- Dùng `personalized_badges.recommended` để highlight các huy hiệu nên ưu tiên
- Dùng `reward_multipliers` để hiển thị điểm thưởng đã được điều chỉnh

---

### 2. 📝 Track Behavior - Ghi Nhận Hành Vi

**GET/POST** `/api/adaptive-gamification/track-behavior`

Ghi nhận hành vi của học viên để hệ thống phân tích.

**Parameters (có thể dùng query hoặc body):**
- `center_id` (required): ID của center
- `action_type` (required): Loại hành động
  - `view_leaderboard`: Xem bảng xếp hạng
  - `view_points`: Xem điểm số
  - `earn_badge`: Nhận huy hiệu
  - `complete_task`: Hoàn thành task
  - `collaborate`: Cộng tác với người khác
  - `react_to_gamification`: Phản ứng với gamification
- `element_type` (optional): Loại element (`points`, `leaderboard`, `badge`, `goal`)
- `metadata` (optional): Thông tin bổ sung (JSON object hoặc string)

**Ví dụ:**
```
GET /api/adaptive-gamification/track-behavior?center_id=xxx&action_type=view_leaderboard&element_type=leaderboard
```

**Response:**
```json
{
  "success": true,
  "message": "Đã ghi nhận hành vi"
}
```

**Khi Nào Gọi:**
- Khi user click vào bảng xếp hạng → `action_type=view_leaderboard`
- Khi user xem điểm số → `action_type=view_points`
- Khi user nhận huy hiệu → `action_type=earn_badge`
- Khi user hoàn thành task → `action_type=complete_task` (hoặc tự động trong backend)

---

### 3. 🔍 Analyze - Phân Tích Lại

**GET/POST** `/api/adaptive-gamification/analyze?center_id=xxx&user_id=xxx`

Yêu cầu hệ thống phân tích lại behavior và cập nhật Motivation Profile.

**Query Parameters:**
- `center_id` (optional): ID của center
- `user_id` (optional): ID của user (mặc định là user hiện tại)

**Response:**
```json
{
  "success": true,
  "data": {
    "competitive_score": 50,
    "collaborative_score": 50,
    "short_term_score": 50,
    "long_term_score": 50,
    "confidence": 0,
    "onboarding_stage": "AWAITING_INITIAL_DATA",
    "insights": [...],
    "recommendations": [...]
  }
}
```

**Khi Nào Gọi:**
- Khi user click nút "Refresh Analysis" (nếu có)
- Hoặc để admin phân tích lại cho user khác

---

### 4. 🏆 Badges Management

#### 4.1. Lấy Tất Cả Badges
**GET** `/api/adaptive-gamification/badges`

Trả về danh sách tất cả badges có sẵn.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "First Task",
      "description": "Hoàn thành task đầu tiên",
      "category": "achievement",
      "criteria": { "type": "task_count", "value": 1 },
      "points_reward": 10,
      "icon_url": "...",
      "is_active": true
    }
  ]
}
```

#### 4.2. Lấy Badge Theo ID
**GET** `/api/adaptive-gamification/badges/:id`

#### 4.3. Tạo Badge Mới (Admin)
**POST** `/api/adaptive-gamification/badges`
```json
{
  "name": "Streak Master",
  "description": "Hoàn thành task 7 ngày liên tiếp",
  "category": "achievement",
  "criteria": { "type": "streak_days", "value": 7 },
  "points_reward": 40,
  "icon_url": "https://..."
}
```

#### 4.4. Cập Nhật Badge (Admin)
**PUT** `/api/adaptive-gamification/badges/:id`

#### 4.5. Xóa Badge (Admin)
**DELETE** `/api/adaptive-gamification/badges/:id`

---

## 🎨 Gợi Ý Thiết Kế UI/UX

### 1. Dashboard Page
- **Motivation Profile Card**: Hiển thị 4 scores (competitive, collaborative, short_term, long_term) dưới dạng progress bars hoặc radar chart
- **Onboarding Stage Badge**: Badge hiển thị giai đoạn hiện tại (AWAITING_INITIAL_DATA, STABLE, etc.)
- **Confidence Indicator**: Hiển thị độ tin cậy (0-100%) với màu sắc phù hợp
- **Insights & Recommendations**: Hiển thị các insight và đề xuất từ AI

### 2. Badges Section
- **Recommended Badges**: Highlight các badges trong `personalized_badges.recommended` với màu sắc hoặc icon đặc biệt
- **Badge Points**: Hiển thị cả `points_reward` (gốc) và `adjusted_points_reward` (đã nhân multiplier) để user thấy được lợi ích
- **Priority Sorting**: Sắp xếp badges theo `priority` (recommended trước)

### 3. Recent Badges Feed
- Hiển thị danh sách `recent_badges` như một feed
- Mỗi item hiển thị: Avatar user, Badge icon, Badge name, Thời gian earned

### 4. Behavior Tracking
- Tự động gọi API `track-behavior` khi user thực hiện các hành động:
  - Click vào leaderboard → `view_leaderboard`
  - Click vào points → `view_points`
  - Nhận badge → `earn_badge`
- Có thể làm silent (không cần hiển thị loading) vì chỉ là tracking

### 5. Personalization Indicators
- Hiển thị `current_strategy` để user biết hệ thống đang dùng chiến lược gì
- Nếu có `skip_reason`, có thể hiển thị tooltip giải thích tại sao chưa điều chỉnh

---

## 🔄 Flow Nghiệp Vụ

### Flow 1: User Mới
1. User đăng nhập lần đầu
2. Gọi `GET /api/adaptive-gamification`
3. Nhận `onboarding_stage = AWAITING_INITIAL_DATA`, `confidence = 0`
4. Hiển thị message: "Hệ thống đang thu thập dữ liệu để hiểu bạn hơn..."
5. User sử dụng hệ thống → Tự động track behavior
6. Sau 7-30 ngày, AI phân tích và cập nhật profile

### Flow 2: User Đã Có Profile
1. User vào Dashboard
2. Gọi `GET /api/adaptive-gamification`
3. Nhận profile với `confidence >= 30`, `onboarding_stage = STABLE`
4. Hiển thị personalized badges với multipliers
5. User hoàn thành task → Tự động award badge với điểm đã nhân multiplier

### Flow 3: Admin Quản Lý Badges
1. Admin vào trang quản lý badges
2. Gọi `GET /api/adaptive-gamification/badges` để xem tất cả
3. Tạo badge mới: `POST /api/adaptive-gamification/badges`
4. Cập nhật: `PUT /api/adaptive-gamification/badges/:id`
5. Xóa: `DELETE /api/adaptive-gamification/badges/:id`

---

## ⚠️ Lưu Ý Quan Trọng

1. **Cooldown Period**: Hệ thống chỉ điều chỉnh personalization sau 7 ngày kể từ lần điều chỉnh cuối. Nếu gọi API và thấy `skip_reason = "Cooldown period active"`, đó là bình thường.

2. **Auto Award**: Badges được tự động award khi user hoàn thành task (tích hợp trong backend). Frontend chỉ cần hiển thị notification khi nhận được.

3. **Multipliers**: Điểm thưởng được tự động nhân với multiplier khi award badge. Frontend nên hiển thị cả điểm gốc và điểm đã điều chỉnh.

4. **Onboarding Stages**: User mới sẽ ở `AWAITING_INITIAL_DATA` cho đến khi có đủ dữ liệu. Đây là bình thường, không phải lỗi.

5. **Confidence Score**: Score càng cao, phân tích càng chính xác. < 30 = chưa đủ dữ liệu, >= 60 = đã ổn định.

---

## 📝 Ví Dụ Code (Frontend)

### React/Vue Example

```javascript
// Fetch dashboard data
const fetchDashboard = async (centerId) => {
  const response = await fetch(
    `/api/adaptive-gamification?center_id=${centerId}&days=30&recent_limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};

// Track behavior
const trackBehavior = async (centerId, actionType, elementType = null) => {
  await fetch(
    `/api/adaptive-gamification/track-behavior?center_id=${centerId}&action_type=${actionType}&element_type=${elementType}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
};

// Usage
useEffect(() => {
  // Load dashboard
  const loadDashboard = async () => {
    const dashboard = await fetchDashboard(centerId);
    setMotivationProfile(dashboard.motivation_profile);
    setPersonalizedBadges(dashboard.personalized_badges);
  };
  loadDashboard();
  
  // Track when user views leaderboard
  const handleViewLeaderboard = () => {
    trackBehavior(centerId, 'view_leaderboard', 'leaderboard');
  };
}, []);
```

---

## 🎯 Tóm Tắt

- **API chính**: `GET /api/adaptive-gamification` - Gọi khi vào Dashboard
- **Track behavior**: Gọi khi user thực hiện các hành động liên quan đến gamification
- **Badges**: Hiển thị `personalized_badges.recommended` trước, với điểm đã điều chỉnh
- **Motivation Profile**: Hiển thị để user biết họ đang ở giai đoạn nào
- **Auto Award**: Backend tự động xử lý, frontend chỉ cần hiển thị notification

Chúc FE team thiết kế đẹp! 🚀

