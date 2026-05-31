# Recurring Tasks Test Plan

## Test Cases

### 1. Daily Recurring Task (Every 1 Day)
**Steps:**
1. Open Add Task modal
2. Enter title: "Daily standup"
3. Check "Recurring task" checkbox
4. Select "Daily" pattern
5. Set interval to "1" day
6. Save task
7. Mark task as "Done"
8. Verify new instance is created with status "Todo"

**Expected Result:**
- Original task shows 🔄 badge
- Original task status = Done
- New task created automatically with same title
- New task status = Todo
- New task also has 🔄 badge

### 2. Daily Recurring Task (Every 3 Days)
**Steps:**
1. Create task with Daily pattern, interval = 3
2. Mark as Done
3. Verify next instance created

**Expected Result:**
- Next occurrence date should be 3 days from today

### 3. Weekly Recurring Task (Single Day)
**Steps:**
1. Open Add Task modal
2. Enter title: "Weekly review"
3. Check "Recurring task"
4. Select "Weekly" pattern
5. Check only "Monday"
6. Save task
7. Mark as Done
8. Verify new instance created

**Expected Result:**
- New task created for next Monday

### 4. Weekly Recurring Task (Multiple Days)
**Steps:**
1. Create task with Weekly pattern
2. Select Mon, Wed, Fri
3. Save and mark as Done
4. Verify next instance created

**Expected Result:**
- If today is Monday, next should be Wednesday
- If today is Friday, next should be Monday (next week)

### 5. Recurring Badge Display
**Steps:**
1. Create a recurring task
2. View in task list

**Expected Result:**
- Task shows 🔄 emoji badge next to title

### 6. Edit Recurring Task
**Steps:**
1. Create recurring task
2. Edit the task (change title or description)
3. Save

**Expected Result:**
- Only that instance is modified
- Recurrence pattern preserved

### 7. Delete Recurring Task
**Steps:**
1. Create recurring task
2. Mark as Done (creates next instance)
3. Delete the completed task

**Expected Result:**
- Only that instance is deleted
- Next instance remains

### 8. Validation - Weekly Without Days
**Steps:**
1. Create task with Weekly pattern
2. Don't select any days
3. Try to save

**Expected Result:**
- Error message: "Please select at least one day for weekly recurrence"

## Manual Testing Instructions

1. Navigate to http://localhost:3000
2. Login with admin/admin
3. Click "+" to add a new task
4. Scroll down to see "Recurring task" checkbox
5. Follow test cases above

## What to Verify

✅ Recurring checkbox toggles recurrence options  
✅ Pattern selector switches between Daily/Weekly options  
✅ Daily shows interval input  
✅ Weekly shows weekday checkboxes  
✅ Weekday selector highlights selected days  
✅ Task saves with recurrence data  
✅ Recurring badge (🔄) appears on task card  
✅ Marking task as Done creates next instance  
✅ Next instance appears immediately (real-time)  
✅ Original task stays completed  
✅ Next instance has correct date  
✅ Validation works for weekly without days  

## Known Limitations

- Editing a recurring task only affects that instance (not the series)
- Deleting a recurring task only deletes that instance
- No "Edit series" or "Delete series" functionality yet
- Monthly and yearly patterns not implemented yet
