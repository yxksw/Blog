# 课程表数据格式说明

课程表数据文件位于 `src/data/timetable/` 目录下，文件格式为 JSON，包含 5 行数据。

## 文件结构

```
第1行: 配置信息 (TimetableConfigSegment)
第2行: 节次时间 (TimetableNodeTime[])
第3行: 元信息 (TimetableMetaSegment)
第4行: 课程定义 (TimetableCourseDefinition[])
第5行: 课程安排 (TimetableCourseArrangement[])
```

---

## 第1行：配置信息

```json
{
  "courseLen": 45,      // 每节课时长（分钟）
  "id": 1,              // 配置ID
  "name": "默认",        // 配置名称
  "sameBreakLen": false, // 课间休息是否相同
  "sameLen": true,       // 每节课时长是否相同
  "theBreakLen": 10      // 课间休息时长（分钟）
}
```

---

## 第2行：节次时间

定义每节课的开始和结束时间。

```json
[
  {
    "node": 1,              // 节次（第几节课）
    "startTime": "08:00",   // 开始时间（HH:MM）
    "endTime": "08:45",     // 结束时间（HH:MM）
    "timeTable": 1          // 时间表ID
  }
]
```

**示例**：
```json
[
  {"node": 1, "startTime": "08:00", "endTime": "08:45", "timeTable": 1},
  {"node": 2, "startTime": "08:55", "endTime": "09:40", "timeTable": 1},
  {"node": 3, "startTime": "10:00", "endTime": "10:45", "timeTable": 1},
  {"node": 4, "startTime": "10:55", "endTime": "11:40", "timeTable": 1},
  {"node": 5, "startTime": "14:00", "endTime": "14:45", "timeTable": 1},
  {"node": 6, "startTime": "14:55", "endTime": "15:40", "timeTable": 1},
  {"node": 7, "startTime": "16:00", "endTime": "16:45", "timeTable": 1},
  {"node": 8, "startTime": "16:55", "endTime": "17:40", "timeTable": 1}
]
```

---

## 第3行：元信息

```json
{
  "tableName": "2025春季课表",    // 课表名称（显示在页面标题）
  "startDate": "2025-2-17",       // 学期开始日期（格式：YYYY-M-D）
  "maxWeek": 16,                   // 学期总周数
  "nodes": 8,                      // 每天节数（与第2行数组长度一致）
  "showSat": false,                // 是否显示周六
  "showSun": false,                // 是否显示周日
  "sundayFirst": false,            // 周日是否作为每周第一天
  "showOtherWeekCourse": true,     // 是否显示其他周的课程
  "showTime": false,               // 是否显示时间
  "school": "",                    // 学校名称
  "background": "",                // 背景图片
  "textColor": -16777216,          // 文字颜色（ARGB格式）
  "courseTextColor": -1,           // 课程文字颜色
  "strokeColor": -2130706433,      // 边框颜色
  "widgetTextColor": -16777216,    // 小部件文字颜色
  "widgetCourseTextColor": -1,     // 小部件课程文字颜色
  "widgetStrokeColor": -2130706433,// 小部件边框颜色
  "itemAlpha": 50,                 // 项目透明度
  "widgetItemAlpha": 50,           // 小部件项目透明度
  "itemHeight": 42,                // 项目高度
  "widgetItemHeight": 64,          // 小部件项目高度
  "itemTextSize": 12,              // 项目文字大小
  "widgetItemTextSize": 12,        // 小部件项目文字大小
  "id": 2,                         // 元信息ID
  "tid": "unique-id",              // 唯一标识符
  "timeTable": 1,                  // 时间表ID
  "type": 0,                       // 类型
  "updateTime": 1772780768613      // 更新时间戳
}
```

**常用字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `tableName` | ✅ | 课表标题，显示在页面顶部 |
| `startDate` | ✅ | 学期第一天，用于计算当前周次 |
| `maxWeek` | ✅ | 学期总周数，决定生成多少周页面 |
| `nodes` | ✅ | 每天上课节数 |
| `showSat` | ❌ | 是否显示周六，默认false |
| `showSun` | ❌ | 是否显示周日，默认false |

---

## 第4行：课程定义

定义所有课程的基本信息。

```json
[
  {
    "id": 0,                      // 课程唯一ID（从0开始递增）
    "courseName": "高等数学",      // 课程名称
    "color": "#ff6b6b",           // 课程颜色（HEX格式，带透明度的ARGB）
    "credit": 0,                  // 学分
    "note": "",                   // 备注
    "tableId": 2                  // 所属课表ID
  }
]
```

**常用颜色代码**：

| 颜色 | 代码 | 效果 |
|------|------|------|
| 红色 | `#ff6b6b` | 醒目，适合重要课程 |
| 青色 | `#4ecdc4` | 清新，适合理论课 |
| 蓝色 | `#45b7d1` | 稳重，适合专业课 |
| 绿色 | `#96ceb4` | 自然，适合实验课 |
| 黄色 | `#ffeaa7` | 温暖，适合选修课 |
| 粉色 | `#fd79a8` | 活泼，适合艺术类 |
| 紫色 | `#a29bfe` | 优雅，适合文科类 |
| 灰色 | `#dfe6e9` | 中性，适合体育课 |

**示例**：
```json
[
  {"id": 0, "courseName": "高等数学", "color": "#ff6b6b", "credit": 4, "tableId": 2},
  {"id": 1, "courseName": "大学英语", "color": "#4ecdc4", "credit": 3, "tableId": 2},
  {"id": 2, "courseName": "程序设计", "color": "#45b7d1", "credit": 4, "tableId": 2},
  {"id": 3, "courseName": "数据结构", "color": "#96ceb4", "credit": 4, "tableId": 2}
]
```

---

## 第5行：课程安排

定义每门课的具体上课时间、地点等信息。

```json
[
  {
    "id": 0,                  // 对应第4行的课程id
    "day": 1,                 // 星期几（1=周一，2=周二...7=周日）
    "startNode": 1,           // 开始节次（第几节课开始）
    "step": 2,                // 持续节数（通常固定为2）
    "startWeek": 1,           // 开始周次（从第几周开始上）
    "endWeek": 16,            // 结束周次（到第几周结束）
    "room": "教A101",          // 教室
    "teacher": "张老师",       // 教师姓名
    "tableId": 2,             // 所属课表ID
    "level": 0,               // 优先级
    "type": 0,                // 类型
    "ownTime": false,         // 是否自定义时间
    "startTime": "",          // 自定义开始时间
    "endTime": ""             // 自定义结束时间
  }
]
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 对应第4行的课程ID |
| `day` | ✅ | 1-7，表示周一到周日 |
| `startNode` | ✅ | 第几节课开始（1, 3, 5, 7...） |
| `step` | ✅ | 持续节数，通常填2 |
| `startWeek` | ✅ | 从第几周开始（1表示第一周） |
| `endWeek` | ✅ | 到第几周结束 |
| `room` | ❌ | 教室名称 |
| `teacher` | ❌ | 教师姓名 |

**示例**：
```json
[
  // 周一第1-2节，高等数学，1-16周
  {"day": 1, "startNode": 1, "id": 0, "startWeek": 1, "endWeek": 16, "room": "教A101", "teacher": "王教授", "tableId": 2, "step": 2},
  
  // 周一第3-4节，大学英语，1-16周
  {"day": 1, "startNode": 3, "id": 1, "startWeek": 1, "endWeek": 16, "room": "教B203", "teacher": "李老师", "tableId": 2, "step": 2},
  
  // 周二第1-2节，程序设计，1-16周
  {"day": 2, "startNode": 1, "id": 2, "startWeek": 1, "endWeek": 16, "room": "机房C301", "teacher": "张工", "tableId": 2, "step": 2},
  
  // 周三第1-2节，高等数学（双周），2-16周
  {"day": 3, "startNode": 1, "id": 0, "startWeek": 2, "endWeek": 16, "room": "教A101", "teacher": "王教授", "tableId": 2, "step": 2}
]
```

---

## 完整示例

```json
{"courseLen":45,"id":1,"name":"默认","sameBreakLen":false,"sameLen":true,"theBreakLen":10}
[{"endTime":"08:45","node":1,"startTime":"08:00","timeTable":1},{"endTime":"09:35","node":2,"startTime":"08:50","timeTable":1},{"endTime":"10:35","node":3,"startTime":"09:50","timeTable":1},{"endTime":"11:25","node":4,"startTime":"10:40","timeTable":1},{"endTime":"14:00","node":5,"startTime":"13:20","timeTable":1},{"endTime":"14:50","node":6,"startTime":"14:00","timeTable":1},{"endTime":"15:50","node":7,"startTime":"15:10","timeTable":1},{"endTime":"16:40","node":8,"startTime":"16:00","timeTable":1}]
{"background":"","courseTextColor":-1,"id":2,"itemAlpha":50,"itemHeight":42,"itemTextSize":12,"maxWeek":16,"nodes":8,"school":"","showOtherWeekCourse":true,"showSat":false,"showSun":false,"showTime":false,"startDate":"2025-2-17","strokeColor":-2130706433,"sundayFirst":false,"tableName":"2025春季课表","textColor":-16777216,"tid":"example-001","timeTable":1,"type":0,"updateTime":1772780768613,"widgetCourseTextColor":-1,"widgetItemAlpha":50,"widgetItemHeight":64,"widgetItemTextSize":12,"widgetStrokeColor":-2130706433,"widgetTextColor":-16777216}
[{"color":"#ff6b6b","courseName":"高等数学","credit":4,"id":0,"note":"","tableId":2},{"color":"#4ecdc4","courseName":"大学英语","credit":3,"id":1,"note":"","tableId":2},{"color":"#45b7d1","courseName":"程序设计","credit":4,"id":2,"note":"","tableId":2}]
[{"day":1,"endTime":"","endWeek":16,"id":0,"level":0,"ownTime":false,"room":"教A101","startNode":1,"startTime":"","startWeek":1,"step":2,"tableId":2,"teacher":"王教授","type":0},{"day":1,"endTime":"","endWeek":16,"id":1,"level":0,"ownTime":false,"room":"教B203","startNode":3,"startTime":"","startWeek":1,"step":2,"tableId":2,"teacher":"李老师","type":0},{"day":2,"endTime":"","endWeek":16,"id":2,"level":0,"ownTime":false,"room":"机房C301","startNode":1,"startTime":"","startWeek":1,"step":2,"tableId":2,"teacher":"张工","type":0}]
```

---

## 修改步骤

1. **备份原文件**：复制 `default.json` 为 `default.json.backup`
2. **编辑文件**：使用文本编辑器打开 `default.json`
3. **逐行修改**：
   - 第3行：修改学期开始日期、周数、课表名称
   - 第4行：添加你的课程列表
   - 第5行：添加每门课的时间安排
4. **验证格式**：确保每行都是有效的 JSON
5. **重新构建**：运行 `npm run build` 或刷新开发服务器

---

## 注意事项

1. **JSON格式**：每行必须是有效的 JSON，注意逗号和引号
2. **ID对应**：第5行的 `id` 必须对应第4行的课程 `id`
3. **时间格式**：使用 `HH:MM` 格式，如 `08:00`
4. **日期格式**：使用 `YYYY-M-D` 格式，如 `2025-2-17`
5. **周次范围**：`startWeek` 和 `endWeek` 必须在 1 到 `maxWeek` 之间
6. **星期范围**：`day` 必须是 1-7（周一到周日）
