/* Weekly Routine Generator - Option B (full rewritten, with teacher UI + scheduling logic)
   Author: ChatGPT (adapted for Kanai)
   Usage: include this script in your HTML that contains the expected inputs and containers.
*/

let teachers = []; // { id, name, subject, code, classType }

// ---------- Teacher UI / Management ----------

function addTeacher() {
    const name = document.getElementById("teacherName").value.trim();
    const subject = document.getElementById("subjectName").value.trim();
    const code = document.getElementById("subjectCode").value.trim();
    const classType = document.getElementById("classType").value;

    if (!name || !subject || !code) {
        alert("Please enter teacher name, subject, and subject code.");
        return;
    }

    // Add teacher
    teachers.push({
        id: teachers.length, name, subject, code, classType
    });

    // Reset inputs
    document.getElementById("teacherName").value = "";
    document.getElementById("subjectName").value = "";
    document.getElementById("subjectCode").value = "";

    renderTeacherList();
    alert("Teacher added!");
}

function normalizeTeacherIds() {
    for (let i = 0; i < teachers.length; i++) teachers[i].id = i;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toggleTeacherList() {
    const box = document.getElementById("teacherList");
    if (!box) return;
    if (box.style.display === "block") {
        box.style.display = "none";
    } else {
        renderTeacherList();
        box.style.display = "block";
    }
}

function renderTeacherList() {
    const container = document.getElementById("teacherList");
    if (!container) return;
    container.innerHTML = "";

    if (teachers.length === 0) {
        container.innerHTML = "<em>No teachers added yet.</em>";
        return;
    }

    teachers.forEach((t, idx) => {
        const card = document.createElement("div");
        card.className = "teacher-card";
        card.style.border = "1px solid #ddd";
        card.style.padding = "8px";
        card.style.marginBottom = "8px";
        card.style.borderRadius = "6px";
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>Teacher ${idx + 1}</strong>
                <div>
                    <button onclick="startEdit(${idx})">Edit</button>
                    <button onclick="deleteTeacher(${idx})">Delete</button>
                </div>
            </div>
            <div id="view-${idx}">
                <div><b>Name:</b> ${escapeHtml(t.name)}</div>
                <div><b>Subject:</b> ${escapeHtml(t.subject)}</div>
                <div><b>Code:</b> ${escapeHtml(t.code)}</div>
                <div><b>Type:</b> ${escapeHtml(t.classType)}</div>
            </div>
            <div id="edit-${idx}" style="display:none;margin-top:8px;">
                <label>Name</label>
                <input type="text" id="edit-name-${idx}" value="${escapeHtml(t.name)}">
                <label>Subject</label>
                <input type="text" id="edit-subject-${idx}" value="${escapeHtml(t.subject)}">
                <label>Subject Code</label>
                <input type="text" id="edit-code-${idx}" value="${escapeHtml(t.code)}">
                <label>Class Type</label>
                <select id="edit-type-${idx}">
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                </select>
                <div style="margin-top:8px;display:flex;gap:8px;">
                    <button onclick="saveEdit(${idx})">Save</button>
                    <button onclick="cancelEdit(${idx})">Cancel</button>
                </div>
            </div>
        `;
        container.appendChild(card);

        // set select value after insertion
        const sel = document.getElementById(`edit-type-${idx}`);
        if (sel) sel.value = t.classType;
    });
}

function startEdit(index) {
    const view = document.getElementById(`view-${index}`);
    const edit = document.getElementById(`edit-${index}`);
    if (view) view.style.display = "none";
    if (edit) edit.style.display = "block";
}

function cancelEdit(index) {
    const view = document.getElementById(`view-${index}`);
    const edit = document.getElementById(`edit-${index}`);
    if (view) view.style.display = "block";
    if (edit) edit.style.display = "none";
}

function saveEdit(index) {
    const name = document.getElementById(`edit-name-${index}`).value.trim();
    const subject = document.getElementById(`edit-subject-${index}`).value.trim();
    const code = document.getElementById(`edit-code-${index}`).value.trim();
    const type = document.getElementById(`edit-type-${index}`).value;

    if (!name || !subject || !code) {
        alert("Please fill name, subject and code.");
        return;
    }

    teachers[index].name = name;
    teachers[index].subject = subject;
    teachers[index].code = code;
    teachers[index].classType = type;

    normalizeTeacherIds();
    renderTeacherList();
}

function deleteTeacher(index) {
    if (!confirm("Delete this teacher?")) return;
    teachers.splice(index, 1);
    normalizeTeacherIds();
    renderTeacherList();
}

// ---------- Helpers for scheduling ----------

function formatTime(h, m) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function generateAllowedSlots(dayStart, dayEnd) {
    const base = 9 * 60;
    const interval = 40;
    const slots = [];
    for (let t = base; t <= dayEnd; t += interval) {
        if (t >= dayStart) slots.push(t);
    }
    return slots;
}

function shallowClone(obj) {
    return Object.assign({}, obj);
}

// ---------- Main scheduling algorithm ----------

function generateWeeklyRoutine() {
    // Read inputs
    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;
    const thDur = parseInt(document.getElementById("theoryDuration").value, 10);
    const prDur = parseInt(document.getElementById("practicalDuration").value, 10);

    if (!start || !end) { alert("Enter college start and end time."); return; }
    if (!thDur || !prDur) { alert("Enter class durations."); return; }
    if (teachers.length === 0) { alert("Add at least one teacher!"); return; }

    const startMin = parseInt(start.split(":")[0], 10) * 60 + parseInt(start.split(":")[1], 10);
    const endMin = parseInt(end.split(":")[0], 10) * 60 + parseInt(end.split(":")[1], 10);
    if (endMin - startMin < 260) { alert("College time is too small for 260 minutes."); return; }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const dayCount = days.length;

    // setup day containers
    let dayInfo = [];
    for (let i = 0; i < dayCount; i++) {
        dayInfo.push({
            index: i, name: days[i], allocatedMinutes: 0,
            classes: [], // items: { teacher, duration }
            practicalAssigned: false
        });
    }

    // Partition teachers
    const practicalTeachers = teachers.filter(t => t.classType === "Practical");
    const theoryTeachers = teachers.filter(t => t.classType === "Theory");

    // weekly count per subject
    let weeklyCount = {};
    teachers.forEach(t => { weeklyCount[t.subject] = 0; });

    // teacherRemainingSlots (planned) (used primarily for theory planned allocation)
    let teacherRemainingSlots = {};
    for (let t of teachers) teacherRemainingSlots[t.id] = 0;

    // Build subject -> teacher lists
    let theorySubjectMap = {};
    for (let t of theoryTeachers) {
        if (!theorySubjectMap[t.subject]) theorySubjectMap[t.subject] = [];
        theorySubjectMap[t.subject].push(t);
    }
    let practicalSubjectMap = {};
    for (let p of practicalTeachers) {
        if (!practicalSubjectMap[p.subject]) practicalSubjectMap[p.subject] = [];
        practicalSubjectMap[p.subject].push(p);
    }

    // Subject teacher plan for theory (occurrences)
    let subjectTeacherPlan = {};
    for (let subj in theorySubjectMap) {
        const list = theorySubjectMap[subj];
        const n = list.length;
        if (n === 1) subjectTeacherPlan[subj] = [list[0].id, list[0].id, list[0].id];
        else if (n === 2) subjectTeacherPlan[subj] = [list[0].id, list[0].id, list[1].id];
        else subjectTeacherPlan[subj] = [list[0].id, list[1].id, list[2].id];
    }

    // initialize teacherRemainingSlots from theory plan
    for (let subj in subjectTeacherPlan) {
        for (let tid of subjectTeacherPlan[subj]) {
            teacherRemainingSlots[tid] = (teacherRemainingSlots[tid] || 0) + 1;
        }
    }
    // ensure practical teachers at least 1 considered slot
    for (let p of practicalTeachers) teacherRemainingSlots[p.id] = Math.max(teacherRemainingSlots[p.id] || 0, 1);

    // canPlaceOnDay - primary validation (prevents duplicate subject same day and weekly cap)
    function canPlaceOnDay(dayIdx, teacherObj, dur, allowTheoryOverflow = false) {
        // no same subject twice same day
        if (dayInfo[dayIdx].classes.some(c => c.teacher.subject === teacherObj.subject)) return false;
        // weekly limit subject (theory subjects maximum 3)
        if ((weeklyCount[teacherObj.subject] || 0) >= 3) return false;
        // day capacity: block theory if it'll exceed 260 (we allow practical special handling separately)
        if (!allowTheoryOverflow && teacherObj.classType === "Theory" && (dayInfo[dayIdx].allocatedMinutes + dur > 260)) return false;
        return true;
    }

    function placeOnDay(dayIdx, teacherObj, dur) {
        dayInfo[dayIdx].classes.push({ teacher: teacherObj, duration: dur });
        dayInfo[dayIdx].allocatedMinutes += dur;
        if (teacherObj.classType === "Practical") dayInfo[dayIdx].practicalAssigned = true;
        weeklyCount[teacherObj.subject] = (weeklyCount[teacherObj.subject] || 0) + 1;
        if (typeof teacherRemainingSlots[teacherObj.id] !== "undefined") {
            teacherRemainingSlots[teacherObj.id] = Math.max(0, (teacherRemainingSlots[teacherObj.id] || 0) - 1);
        }
    }

    // --------------------- THEORY: Subject-first placement ---------------------
    for (let subj of Object.keys(theorySubjectMap)) {
        const occ = subjectTeacherPlan[subj] || [];
        if (occ.length === 0) continue;

        let best = { count: 0, placements: [] };

        for (let s = 0; s < dayCount; s++) {
            let temp = [];
            let twCount = shallowClone(weeklyCount);
            let tSlots = shallowClone(teacherRemainingSlots);
            let success = 0;

            for (let k = 0; k < occ.length; k++) {
                const dayIdx = (s + 2 * k) % dayCount; // spaced pattern
                const tid = occ[k];
                const teacherObj = teachers[tid];
                const dur = thDur;

                if (tSlots[tid] <= 0) continue;
                if ((twCount[teacherObj.subject] || 0) >= 3) continue;

                const alreadyInDay = dayInfo[dayIdx].classes.some(c => c.teacher.subject === teacherObj.subject) ||
                    temp.some(p => p.dayIdx === dayIdx && teachers[p.teacherId].subject === teacherObj.subject);
                if (alreadyInDay) continue;

                // simulate day allocation including temp placements
                let dayAllocated = dayInfo[dayIdx].allocatedMinutes;
                for (let p of temp) if (p.dayIdx === dayIdx) dayAllocated += (teachers[p.teacherId].classType === "Practical" ? prDur : thDur);

                if (dayAllocated + dur > 260) continue;

                temp.push({ dayIdx, teacherId: tid });
                tSlots[tid] -= 1;
                twCount[teacherObj.subject] = (twCount[teacherObj.subject] || 0) + 1;
                success++;
            }

            if (success > best.count) {
                best = { count: success, placements: temp.slice() };
                if (best.count === Math.min(3, occ.length)) break;
            }
        }

        // apply best placements
        for (let p of best.placements) {
            const tObj = teachers[p.teacherId];
            placeOnDay(p.dayIdx, tObj, thDur);
        }
    }

    // --------------------- PRACTICALS: Round-robin Mon->Fri then repeat ---------------------
    // Build unique practical subject queue preserving input order
    let practicalQueue = [];
    let seen = new Set();
    for (let p of practicalTeachers) {
        if (!seen.has(p.subject)) {
            seen.add(p.subject);
            practicalQueue.push({
                subject: p.subject,
                teachers: practicalSubjectMap[p.subject].slice()
            });
        }
    }

    const threshold = Math.ceil(prDur / 2); // require at least half free minutes
    let dayPointer = 0; // will advance so first 5 try Mon->Fri

    for (let pq of practicalQueue) {
        if ((weeklyCount[pq.subject] || 0) > 0) continue; // already placed
        let placed = false;
        let attempts = 0;
        const maxAttempts = dayCount * 5; // up to 5 rounds

        while (!placed && attempts < maxAttempts) {
            const d = dayPointer % dayCount;
            const free = Math.max(0, 260 - dayInfo[d].allocatedMinutes);

            if (free >= threshold) {
                // try teachers for this subject
                for (let teacherOpt of pq.teachers) {
                    // must be totally free that day (per your rule) - ie teacher has no classes that day
                    const teacherHasClassThatDay = dayInfo[d].classes.some(c => c.teacher.id === teacherOpt.id);
                    if (teacherHasClassThatDay) continue;
                    // ensure not duplicate subject on day
                    if (dayInfo[d].classes.some(c => c.teacher.subject === pq.subject)) continue;
                    // final canPlaceOnDay check (allow theory overflow not relevant)
                    if (!canPlaceOnDay(d, teacherOpt, prDur, true)) continue;

                    // place even if it triggers overflow beyond 260 (per your rule)
                    placeOnDay(d, teacherOpt, prDur);
                    placed = true;
                    break;
                }
            }

            dayPointer++;
            attempts++;
        }

        dayPointer++; // advance for next practical to spread across days
    }

    // --------------------- FALLBACK: Greedy fill remaining with theory teachers ---------------------
    let theoryCandidates = theoryTeachers.slice();
    function sortByPriority(a, b) {
        const ra = teacherRemainingSlots[a.id] || 0;
        const rb = teacherRemainingSlots[b.id] || 0;
        if (ra !== rb) return rb - ra;
        const ca = weeklyCount[a.subject] || 0;
        const cb = weeklyCount[b.subject] || 0;
        if (ca !== cb) return ca - cb;
        return 0;
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (let d = 0; d < dayCount; d++) {
            if ((260 - dayInfo[d].allocatedMinutes) < thDur) continue;
            theoryCandidates.sort(sortByPriority);
            for (let t of theoryCandidates) {
                const hasSlot = ((teacherRemainingSlots[t.id] || 0) > 0) || ((weeklyCount[t.subject] || 0) < 3);
                if (!hasSlot) continue;
                if (!canPlaceOnDay(d, t, thDur)) continue;
                placeOnDay(d, t, thDur);
                changed = true;
                break;
            }
        }
    }

    // --------------------- FINAL fallback for remaining practicals (if any) ---------------------
    for (let pq of practicalQueue) {
        if ((weeklyCount[pq.subject] || 0) > 0) continue;
        for (let d = 0; d < dayCount; d++) {
            // require half threshold
            if ((260 - dayInfo[d].allocatedMinutes) < threshold) continue;
            for (let teacherOpt of pq.teachers) {
                const teacherHasClassThatDay = dayInfo[d].classes.some(c => c.teacher.id === teacherOpt.id);
                if (teacherHasClassThatDay) continue;
                if (!canPlaceOnDay(d, teacherOpt, prDur, true)) continue;
                placeOnDay(d, teacherOpt, prDur);
                break;
            }
            if ((weeklyCount[pq.subject] || 0) > 0) break;
        }
    }

    // --------------------- Ensure every subject appears at least once (theory replacements only) ---------------------
    // Build set of all subjects from teachers
    function ensureAllSubjectsAssigned() {
        const allSubjects = {};
        for (let t of teachers) {
            if (!allSubjects[t.subject]) allSubjects[t.subject] = { subject: t.subject, isPractical: t.classType === "Practical" };
        }
        // missing subjects:
        let missing = [];
        for (let subj in allSubjects) if ((weeklyCount[subj] || 0) === 0) missing.push(subj);
        if (missing.length === 0) return;

        function getTeachersForSubject(subj) {
            return teachers.filter(tt => tt.subject === subj);
        }

        // Pass 1: conservative replace only from theory slots whose subject count > 1
        for (let subj of missing.slice()) {
            const opts = getTeachersForSubject(subj);
            if (opts.length === 0) continue;

            if (opts[0].classType === "Practical") {
                // Try place practical (we do not replace to create practicals)
                let placed = false;
                for (let d = 0; d < dayCount && !placed; d++) {
                    for (let teacherOpt of opts) {
                        if (dayInfo[d].classes.some(c => c.teacher.id === teacherOpt.id)) continue;
                        // allow overflow if necessary
                        placeOnDay(d, teacherOpt, prDur);
                        placed = true;
                        break;
                    }
                }
                if (placed) missing = missing.filter(x => x !== subj);
                continue;
            }

            let placed = false;
            for (let d = 0; d < dayCount && !placed; d++) {
                for (let i = 0; i < dayInfo[d].classes.length && !placed; i++) {
                    const slot = dayInfo[d].classes[i];
                    if (slot.teacher.classType !== "Theory") continue;
                    const existingSubj = slot.teacher.subject;
                    if ((weeklyCount[existingSubj] || 0) <= 1) continue; // don't remove last occurrence

                    // find teacher for missing subj free that day
                    for (let teacherOpt of opts) {
                        if (dayInfo[d].classes.some(c => c.teacher.id === teacherOpt.id)) continue;
                        if (dayInfo[d].classes.some(c => c.teacher.subject === subj)) continue;

                        // replace
                        weeklyCount[existingSubj] = Math.max(0, (weeklyCount[existingSubj] || 0) - 1);
                        dayInfo[d].classes[i] = { teacher: teacherOpt, duration: thDur };
                        weeklyCount[subj] = (weeklyCount[subj] || 0) + 1;
                        dayInfo[d].allocatedMinutes = Math.max(0, dayInfo[d].allocatedMinutes - slot.duration + thDur);
                        placed = true;
                        break;
                    }
                }
            }
            if (placed) missing = missing.filter(x => x !== subj);
        }

        // Pass 2: more relaxed replace - allow replacing theory slots where existing subject occurs elsewhere
        for (let subj of missing.slice()) {
            const opts = getTeachersForSubject(subj);
            if (opts.length === 0) continue;
            if (opts[0].classType === "Practical") continue; // skip

            let placed = false;
            for (let d = 0; d < dayCount && !placed; d++) {
                for (let i = 0; i < dayInfo[d].classes.length && !placed; i++) {
                    const slot = dayInfo[d].classes[i];
                    if (slot.teacher.classType !== "Theory") continue;
                    const existingSubj = slot.teacher.subject;
                    const existingCount = weeklyCount[existingSubj] || 0;
                    if (existingCount <= 1) continue; // avoid eliminating last occurrence

                    for (let teacherOpt of opts) {
                        if (dayInfo[d].classes.some(c => c.teacher.id === teacherOpt.id)) continue;
                        if (dayInfo[d].classes.some(c => c.teacher.subject === subj)) continue;

                        // replace
                        weeklyCount[existingSubj] = Math.max(0, (weeklyCount[existingSubj] || 0) - 1);
                        dayInfo[d].classes[i] = { teacher: teacherOpt, duration: thDur };
                        weeklyCount[subj] = (weeklyCount[subj] || 0) + 1;
                        dayInfo[d].allocatedMinutes = Math.max(0, dayInfo[d].allocatedMinutes - slot.duration + thDur);
                        placed = true;
                        break;
                    }
                }
            }
            if (placed) missing = missing.filter(x => x !== subj);
        }

        // If still missing, log it (deep swap/backtracking required to guarantee all)
        if (missing.length > 0) {
            console.warn("Could not place these subjects automatically (needs deeper swaps):", missing);
        }
    }

    ensureAllSubjectsAssigned();

    // --------------------- Render Routine ---------------------
    const earliestAllowedSlots = generateAllowedSlots(startMin, endMin - 260);
    if (earliestAllowedSlots.length === 0) { alert("No valid starting slot available within college hours to fit 260 minutes."); return; }
    const dayStart = earliestAllowedSlots[0];

    let html = "<h3>Weekly Routine</h3>";
    html += "<table><tr><th>Day</th><th>Classes</th></tr>";

    for (let d = 0; d < dayCount; d++) {
        const classEntries = dayInfo[d].classes.slice(); // copy
        const theories = classEntries.filter(c => c.teacher.classType === "Theory");
        const practicals = classEntries.filter(c => c.teacher.classType === "Practical");

        // Insert practicals in middle of theory list if present
        let ordered = [];
        if (practicals.length > 0) {
            const mid = Math.floor(theories.length / 2);
            ordered = theories.slice(0, mid).concat(practicals).concat(theories.slice(mid));
        } else ordered = theories.slice();

        let blocks = "";
        let currentTime = dayStart;
        let totalAllocated = 0;
        for (let entry of ordered) {
            const t = entry.teacher;
            const dur = entry.duration;
            const sh = Math.floor(currentTime / 60);
            const sm = currentTime % 60;
            const eh = Math.floor((currentTime + dur) / 60);
            const em = (currentTime + dur) % 60;

            blocks += `
                <div class="class-block">
                    <strong>${escapeHtml(t.subject)} (${escapeHtml(t.code)})</strong><br>
                    <em>${escapeHtml(t.name)}</em><br>
                    <small>${formatTime(sh, sm)} - ${formatTime(eh, em)}</small>
                </div>
            `;
            currentTime += dur;
            totalAllocated += dur;
        }

        if (totalAllocated < 260) {
            blocks += `
                <div class="class-block" style="background:#fff4e6;border-color:#ffd59e;">
                    <strong>Free</strong><br>
                    <small>${260 - totalAllocated} min remaining</small>
                </div>
            `;
        }

        html += `<tr><td class="day-column">${days[d]}</td><td><div class="class-row">${blocks}</div></td></tr>`;
    }

    html += "</table>";
    document.getElementById("routine").innerHTML = html;
}
