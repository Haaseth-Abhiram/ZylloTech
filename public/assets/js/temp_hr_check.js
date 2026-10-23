
    let employeesData = [];
    let teamsData = [];
    let leavesData = [];
    let attendanceData = [];
    let ticketsData = [];
    let currentPodFilter = 'all';
    let currentLeaveFilter = 'all';
    let currentAttFilter = 'all';

    document.addEventListener('DOMContentLoaded', () => {
      // Auth verification
      const userJson = localStorage.getItem('zyllotech_user');
      if (userJson) {
        try {
          const u = JSON.parse(userJson);
          if (u.name) {
            document.getElementById('dropdownUserName').textContent = u.name;
            document.getElementById('hrSidebarName').textContent = u.name;
            document.getElementById('userMenuBtn').innerHTML = `<i class="bi bi-person-circle me-1"></i> ${u.name.split(' ')[0]}`;
            const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('hrSidebarInitials').textContent = initials;
          }
          if (u.email) document.getElementById('dropdownUserEmail').textContent = u.email;
        } catch (e) {}
      }

      // Pre-fill today's date for regularize modal
      const regDateEl = document.getElementById('reg-date');
      if (regDateEl) regDateEl.value = new Date().toISOString().substring(0, 10);
      const newJoinEl = document.getElementById('new-emp-joining');
      if (newJoinEl) newJoinEl.value = new Date().toISOString().substring(0, 10);

      // Load initial datasets
      loadHrStats();
      loadHrEmployees();
      loadHrTeams();
      loadHrLeaves();
      loadHrAttendance();
      loadHrTickets();
      loadHrHolidays();

      // Setup user dropdown toggle
      setupDropdownToggle('userMenuBtn', document.querySelector('#userMenuBtn + .zy-dropdown-menu'));

      // Periodic auto-sync every 4 seconds
      setInterval(() => {
        loadHrStats();
        loadHrLeaves();
        loadHrAttendance();
        loadHrTickets();
      }, 4000);
    });

    // Mobile sidebar toggle
    function toggleHrSidebar() {
      const sidebar = document.getElementById('hrSidebar');
      const backdrop = document.getElementById('hrSidebarBackdrop');
      if (sidebar && backdrop) {
        sidebar.classList.toggle('show');
        backdrop.classList.toggle('show');
      }
    }

    // Tab Switcher
    function switchHrTab(tabName) {
      const tabs = {
        overview: document.getElementById('tabHrOverview'),
        employees: document.getElementById('tabHrEmployees'),
        teams: document.getElementById('tabHrTeams'),
        leaves: document.getElementById('tabHrLeaves'),
        attendance: document.getElementById('tabHrAttendance'),
        tickets: document.getElementById('tabHrTickets'),
        holidays: document.getElementById('tabHrHolidays')
      };

      const titles = {
        overview: 'HR Overview',
        employees: 'Global Employee Directory',
        teams: 'Engineering Pods & Team Leads',
        leaves: 'Leave Approvals Desk',
        attendance: 'Attendance & Shift Monitor',
        tickets: 'HR Help Desk & Grievance Management',
        holidays: 'Holidays & Calendar'
      };

      const topbarEl = document.getElementById('topbarCurrentTab');
      if (topbarEl && titles[tabName]) topbarEl.textContent = titles[tabName];

      Object.keys(tabs).forEach(key => {
        const view = tabs[key];
        const btn = document.getElementById(`sidebar-hr-${key}`);
        if (view) {
          if (key === tabName) view.classList.remove('d-none');
          else view.classList.add('d-none');
        }
        if (btn) {
          if (key === tabName) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });

      // Close mobile sidebar if open
      const sidebar = document.getElementById('hrSidebar');
      const backdrop = document.getElementById('hrSidebarBackdrop');
      if (sidebar && backdrop && window.innerWidth < 992) {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
      }

      const mainPane = document.querySelector('.zy-admin-main-pane');
      if (mainPane) mainPane.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 1. Load Stats
    async function loadHrStats() {
      try {
        const res = await fetch('/api/hr/stats');
        const data = await res.json();
        if (data.success && data.stats) {
          const s = data.stats;
          document.getElementById('hrStatTotalEmployees').textContent = s.totalEmployees || 0;
          document.getElementById('hrStatTotalLeads').textContent = s.totalLeads || 0;
          document.getElementById('hrStatPendingLeaves').textContent = s.pendingLeaves || 0;
          document.getElementById('hrStatPresentToday').textContent = s.presentToday || 0;
          document.getElementById('hrStatOpenTickets').textContent = s.openTickets || 0;

          const bLeaves = document.getElementById('hr-badge-leaves');
          if (bLeaves) bLeaves.textContent = s.pendingLeaves < 10 ? `0${s.pendingLeaves}` : s.pendingLeaves;
          const pFilterNum = document.getElementById('hrLeavePendingFilterNum');
          if (pFilterNum) pFilterNum.textContent = s.pendingLeaves;

          const bTickets = document.getElementById('hr-badge-tickets');
          if (bTickets) bTickets.textContent = s.openTickets < 10 ? `0${s.openTickets}` : s.openTickets;
        }
      } catch (e) {}
    }

    // 2. Load Employees
    async function loadHrEmployees() {
      const tbody = document.getElementById('hrEmployeesTableBody');
      const regSelect = document.getElementById('reg-emp-id');
      try {
        const res = await fetch('/api/hr/employees');
        const data = await res.json();
        if (data.success && data.employees) {
          employeesData = data.employees;
          document.getElementById('hr-badge-employees').textContent = employeesData.length < 10 ? `0${employeesData.length}` : employeesData.length;

          // Populate select in regularize modal
          if (regSelect) {
            regSelect.innerHTML = employeesData.map(e => `<option value="${escapeHtml(e.emp_id)}">${escapeHtml(e.full_name)} (${escapeHtml(e.emp_id)} - ${escapeHtml(e.department)})</option>`).join('');
          }

          renderHrEmployeesTable();
        }
      } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Failed to load employee directory.</td></tr>';
      }
    }

    function renderHrEmployeesTable() {
      const tbody = document.getElementById('hrEmployeesTableBody');
      if (!tbody) return;

      const searchVal = (document.getElementById('employeeSearchInput')?.value || '').toLowerCase().trim();

      let filtered = employeesData.filter(e => {
        if (currentPodFilter !== 'all' && !e.department.toLowerCase().includes(currentPodFilter.toLowerCase())) {
          return false;
        }
        if (searchVal) {
          const matchName = (e.full_name || '').toLowerCase().includes(searchVal);
          const matchId = (e.emp_id || '').toLowerCase().includes(searchVal);
          const matchDesig = (e.designation || '').toLowerCase().includes(searchVal);
          const matchDept = (e.department || '').toLowerCase().includes(searchVal);
          const matchLead = (e.manager_name || '').toLowerCase().includes(searchVal);
          return matchName || matchId || matchDesig || matchDept || matchLead;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-white-50"><i class="bi bi-inbox me-2"></i>No employees found matching filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(e => {
        const initials = (e.full_name || 'EM').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style="width: 34px; height: 34px; min-width: 34px; background: #2563eb; font-size: 0.8rem;">
                  ${initials}
                </div>
                <div>
                  <strong class="text-white d-block">${escapeHtml(e.full_name)}</strong>
                  <small class="text-white-50" style="font-size: 0.72rem;">${escapeHtml(e.emp_id)} · ${escapeHtml(e.email)}</small>
                </div>
              </div>
            </td>
            <td><strong class="text-white">${escapeHtml(e.designation)}</strong></td>
            <td><span class="badge bg-secondary bg-opacity-25 border border-white-10 text-white">${escapeHtml(e.department)}</span></td>
            <td>
              <span class="text-primary fw-semibold"><i class="bi bi-person-badge me-1"></i>${escapeHtml(e.manager_name || 'Dr. K. Srinivas')}</span>
            </td>
            <td><small class="text-white-50">${escapeHtml(e.phone || '+91 98480 00000')}</small></td>
            <td><small class="text-white-50">${escapeHtml(e.work_location || 'Guntur')}</small></td>
            <td><small class="text-white-50">${escapeHtml(e.joining_date || '2024')}</small></td>
            <td class="text-end">
              <span class="badge bg-success bg-opacity-25 text-success border border-success">Active Staff</span>
            </td>
          </tr>
        `;
      }).join('');
    }

    function filterEmployeesPod(pod) {
      currentPodFilter = pod;
      ['All', 'Eng', 'Cloud', 'Design'].forEach(p => {
        const btn = document.getElementById(`empFilter${p}`);
        if (btn) {
          const match = (p === 'All' && pod === 'all') || (p === 'Eng' && pod === 'Engineering') || (p === 'Cloud' && pod === 'Cloud') || (p === 'Design' && pod === 'Frontend');
          if (match) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
      renderHrEmployeesTable();
    }

    function filterEmployeesSearch() {
      renderHrEmployeesTable();
    }

    // 3. Load Teams & Leads
    async function loadHrTeams() {
      const grid = document.getElementById('hrTeamsGrid');
      const overviewTeams = document.getElementById('overviewTeamsList');
      try {
        const res = await fetch('/api/hr/teams');
        const data = await res.json();
        if (data.success && data.teams) {
          teamsData = data.teams;
          
          if (grid) {
            grid.innerHTML = teamsData.map((t, idx) => {
              const members = t.member_names ? t.member_names.split(/[\u2022\uFFFD•,]/).map(s => s.trim()).filter(Boolean) : [];
              return `
                <div class="col-md-6 col-lg-4">
                  <div class="pod-card d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <span class="badge bg-primary bg-opacity-25 text-info border border-primary border-opacity-50 rounded-pill px-2.5 py-1" style="font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;">POD #${idx + 1}</span>
                      <span class="badge bg-secondary bg-opacity-25 text-white-50 border border-white-10 rounded-pill px-2.5 py-1" style="font-size: 0.72rem;">${t.member_count} ${t.member_count === 1 ? 'Member' : 'Members'}</span>
                    </div>
                    <h5 class="fw-bold text-white mb-3" style="font-size: 1.12rem; line-height: 1.35;">${escapeHtml(t.department)}</h5>
                    
                    <div class="rounded-3 mb-3 p-3" style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.22); border-radius: 10px;">
                      <div class="text-white-50 mb-1.5" style="font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">DESIGNATED TEAM LEAD / REPORTING MANAGER</div>
                      <div class="text-white fw-bold d-flex align-items-center gap-2" style="font-size: 0.95rem; line-height: 1.3;">
                        <i class="bi bi-star-fill text-warning" style="font-size: 0.85rem;"></i>
                        <span>${escapeHtml(t.manager_name || 'Dr. K. Srinivas (VP of Engineering)')}</span>
                      </div>
                    </div>

                    <div class="mb-3">
                      <div class="text-white-50 mb-2" style="font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">POD ROSTER</div>
                      <div class="d-flex flex-wrap gap-2">
                        ${members.map(m => `<span class="badge rounded-pill px-2.5 py-1 text-white" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 0.75rem; font-weight: 500;">${escapeHtml(m)}</span>`).join('')}
                      </div>
                    </div>

                    <div class="border-top border-white-10 pt-3 mt-auto d-flex justify-content-between align-items-center">
                      <small class="text-success d-flex align-items-center gap-1.5 fw-medium" style="font-size: 0.78rem;">
                        <i class="bi bi-check-circle-fill"></i> Active Sprint Operations
                      </small>
                      <button class="btn btn-sm btn-link text-info p-0 text-decoration-none d-flex align-items-center gap-1" style="font-size: 0.78rem;" onclick="switchHrTab('employees')">
                        <span>View Directory</span> <i class="bi bi-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('');
          }

          if (overviewTeams) {
            overviewTeams.innerHTML = teamsData.slice(0, 4).map(t => `
              <div class="p-3 rounded-3 d-flex justify-content-between align-items-center" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; transition: all 0.2s ease;">
                <div>
                  <strong class="text-white small d-block mb-1">${escapeHtml(t.department)}</strong>
                  <small class="text-info d-flex align-items-center gap-1.5" style="font-size: 0.75rem;">
                    <i class="bi bi-star-fill text-warning" style="font-size: 0.7rem;"></i>
                    <span>Lead: <strong>${escapeHtml(t.manager_name || 'Dr. Srinivas')}</strong></span>
                  </small>
                </div>
                <span class="badge bg-primary bg-opacity-25 text-info border border-primary border-opacity-50 rounded-pill px-2.5 py-1 flex-shrink-0" style="font-size: 0.72rem; font-weight: 600;">
                  ${t.member_count} Staff
                </span>
              </div>
            `).join('');
          }
        }
      } catch (e) {}
    }

    // 4. Load Leaves
    async function loadHrLeaves() {
      const tbody = document.getElementById('hrLeavesTableBody');
      const overviewPending = document.getElementById('overviewPendingLeavesList');
      try {
        const res = await fetch('/api/admin/employee-leaves');
        const data = await res.json();
        if (data.success && data.leaves) {
          leavesData = data.leaves;
          renderHrLeavesTable();

          // Overview pending leaves
          if (overviewPending) {
            const pendingList = leavesData.filter(l => l.status === 'Pending');
            if (pendingList.length === 0) {
              overviewPending.innerHTML = '<div class="p-3 text-center rounded-3 text-white-50 small" style="background: rgba(255,255,255,0.02);"><i class="bi bi-check2-circle text-success me-1"></i>No pending leave requests! All reviewed.</div>';
            } else {
              overviewPending.innerHTML = pendingList.slice(0, 4).map(l => `
                <div class="p-3 rounded-3 d-flex justify-content-between align-items-center" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; transition: all 0.2s ease;">
                  <div>
                    <div class="text-white small fw-semibold d-flex align-items-center gap-2 mb-1">
                      <span>${escapeHtml(l.full_name)}</span>
                      <span class="badge bg-warning bg-opacity-25 text-warning rounded-pill px-2.5 py-0.5" style="font-size: 0.7rem; font-weight: 600;">${escapeHtml(l.leave_type)}</span>
                    </div>
                    <div class="text-white-50 d-flex align-items-center gap-1.5" style="font-size: 0.75rem;">
                      <i class="bi bi-clock text-warning"></i>
                      <span>${escapeHtml(l.start_date)} &middot; <strong>${l.days} day(s)</strong> &mdash; <em>&ldquo;${escapeHtml(l.reason || 'Personal')}&rdquo;</em></span>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2 ms-3 flex-shrink-0">
                    <button class="btn btn-sm btn-success rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1" style="font-size: 0.74rem;" onclick="handleHrLeaveAction(${l.id}, 'approve')">
                      <i class="bi bi-check-lg"></i> Accept
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1" style="font-size: 0.74rem;" onclick="handleHrLeaveAction(${l.id}, 'reject')">
                      <i class="bi bi-x-lg"></i> Reject
                    </button>
                  </div>
                </div>
              `).join('');
    }

    function filterHrLeaves(filter) {
      currentLeaveFilter = filter;
      ['All', 'Pending', 'Approved', 'Rejected'].forEach(f => {
        const btn = document.getElementById(`filterHrLeave${f}`);
        if (btn) {
          if (f.toLowerCase() === filter.toLowerCase() || (f === 'All' && filter === 'all')) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
      renderHrLeavesTable();
    }

    function filterHrLeavesSearch() {
      renderHrLeavesTable();
    }

    async function handleHrLeaveAction(leaveId, action) {
      const verb = action === 'approve' ? 'Accept / Approve' : 'Reject';
      if (!confirm(`Are you sure you want to ${verb} this employee leave application?`)) return;

      try {
        const res = await fetch(`/api/admin/employee-leaves/${leaveId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message || `Leave application decision saved.`);
          loadHrLeaves();
          loadHrStats();
        }
      } catch (e) {
        alert('Error processing leave decision.');
      }
    }

    // 5. Load Attendance
    async function loadHrAttendance() {
      const tbody = document.getElementById('hrAttendanceTableBody');
      try {
        const res = await fetch('/api/admin/employee-attendance');
        const data = await res.json();
        if (data.success && data.attendance) {
          attendanceData = data.attendance;
          document.getElementById('hr-badge-attendance').textContent = attendanceData.length < 10 ? `0${attendanceData.length}` : attendanceData.length;
          renderHrAttendanceTable();
        }
      } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load attendance logs.</td></tr>';
      }
    }

    function renderHrAttendanceTable() {
      const tbody = document.getElementById('hrAttendanceTableBody');
      if (!tbody) return;

      const searchVal = (document.getElementById('searchHrAttendanceInput')?.value || '').toLowerCase().trim();

      let filtered = attendanceData.filter(a => {
        if (currentAttFilter !== 'all' && a.status !== currentAttFilter) return false;
        if (searchVal) {
          const matchName = (a.full_name || '').toLowerCase().includes(searchVal);
          const matchDate = (a.date || '').toLowerCase().includes(searchVal);
          const matchStatus = (a.status || '').toLowerCase().includes(searchVal);
          return matchName || matchDate || matchStatus;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-white-50"><i class="bi bi-clock me-2"></i>No attendance logs matching filter.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        let badge = '<span class="badge bg-success bg-opacity-25 text-success border border-success rounded-pill px-2.5 py-1">Present</span>';
        if (a.status === 'Work From Home') badge = '<span class="badge bg-info bg-opacity-25 text-info border border-info rounded-pill px-2.5 py-1">Work From Home</span>';
        if (a.status === 'On Duty') badge = '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning rounded-pill px-2.5 py-1">On Duty</span>';

        return `
          <tr>
            <td>
              <strong class="text-white d-block">${escapeHtml(a.full_name || 'Staff')}</strong>
              <small class="text-white-50" style="font-size: 0.72rem;">${escapeHtml(a.emp_id)} · ${escapeHtml(a.department || 'Engineering')}</small>
            </td>
            <td><strong class="text-white">${escapeHtml(a.date)}</strong></td>
            <td><span class="badge bg-secondary bg-opacity-25 border border-white-10 text-white-50">09:30 AM &ndash; 06:30 PM IST</span></td>
            <td><span class="text-success fw-bold">${escapeHtml(a.punch_in)}</span></td>
            <td><span class="text-white-50">${escapeHtml(a.punch_out || '--:--')}</span></td>
            <td><span class="badge bg-secondary">${escapeHtml(a.work_hours || 'In Progress')}</span></td>
            <td class="text-end">${badge}</td>
          </tr>
        `;
      }).join('');
    }

    function filterHrAttendance(filter) {
      currentAttFilter = filter;
      ['All', 'Present', 'Wfh'].forEach(f => {
        const btn = document.getElementById(`filterHrAtt${f}`);
        if (btn) {
          const match = (f === 'All' && filter === 'all') || (f === 'Present' && filter === 'Present') || (f === 'Wfh' && filter === 'Work From Home');
          if (match) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
      renderHrAttendanceTable();
    }

    function filterHrAttendanceSearch() {
      renderHrAttendanceTable();
    }

    // 6. Load Tickets
    async function loadHrTickets() {
      const tbody = document.getElementById('hrTicketsTableBody');
      try {
        const res = await fetch('/api/hr/tickets');
        const data = await res.json();
        if (data.success && data.tickets) {
          ticketsData = data.tickets;
          const openCount = ticketsData.filter(t => t.status === 'Open').length;
          document.getElementById('hr-badge-tickets').textContent = openCount < 10 ? `0${openCount}` : openCount;

          if (tbody) {
            if (ticketsData.length === 0) {
              tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-white-50">No HR help desk queries found.</td></tr>';
              return;
            }

            tbody.innerHTML = ticketsData.map(t => {
              let statusBadge = '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger rounded-pill px-2.5 py-1">Open</span>';
              if (t.status === 'In Progress') statusBadge = '<span class="badge bg-warning bg-opacity-25 text-warning border border-warning rounded-pill px-2.5 py-1">In Progress</span>';
              if (t.status === 'Resolved') statusBadge = '<span class="badge bg-success bg-opacity-25 text-success border border-success rounded-pill px-2.5 py-1">Resolved</span>';

              return `
                <tr>
                  <td><span class="badge bg-secondary">#HR-${t.id}</span></td>
                  <td>
                    <strong class="text-white d-block">${escapeHtml(t.full_name || 'Alex Morgan')}</strong>
                    <small class="text-white-50" style="font-size: 0.72rem;">${escapeHtml(t.department || 'Engineering Pod')}</small>
                  </td>
                  <td><span class="badge bg-secondary bg-opacity-25 border border-white-10 text-white">${escapeHtml(t.category)}</span></td>
                  <td>
                    <strong class="text-white d-block small">${escapeHtml(t.subject)}</strong>
                    <p class="text-white-50 small mb-1" style="font-size: 0.75rem;">${escapeHtml(t.description)}</p>
                    ${t.hr_response ? `<div class="p-1.5 rounded-2 bg-success bg-opacity-10 border border-success border-opacity-25 text-success small" style="font-size: 0.72rem;"><strong>HR Response:</strong> ${escapeHtml(t.hr_response)}</div>` : ''}
                  </td>
                  <td><span class="badge ${t.priority === 'High' ? 'bg-danger' : (t.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-info text-dark')}">${escapeHtml(t.priority)}</span></td>
                  <td>${statusBadge}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-brand-outline py-1 px-2.5" onclick="openRespondModal(${t.id})">
                      <i class="bi bi-reply-fill me-1"></i> Respond
                    </button>
                  </td>
                </tr>
              `;
            }).join('');
          }
        }
      } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load HR tickets.</td></tr>';
      }
    }

    function openRespondModal(ticketId) {
      const ticket = ticketsData.find(t => t.id === ticketId);
      if (!ticket) return;

      document.getElementById('respTicketId').value = ticket.id;
      document.getElementById('respTicketMeta').textContent = `From: ${ticket.full_name} (${ticket.department}) · Category: ${ticket.category}`;
      document.getElementById('respTicketSubject').textContent = ticket.subject;
      document.getElementById('respTicketDesc').textContent = ticket.description;
      document.getElementById('respTicketResponse').value = ticket.hr_response || '';

      const modalEl = document.getElementById('respondTicketModal');
      if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    async function handleRespondTicket(e) {
      e.preventDefault();
      const id = document.getElementById('respTicketId').value;
      const hr_response = document.getElementById('respTicketResponse').value;
      const status = document.getElementById('respTicketStatus').value;

      try {
        const res = await fetch(`/api/hr/tickets/${id}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hr_response, status })
        });
        const data = await res.json();
        if (data.success) {
          bootstrap.Modal.getInstance(document.getElementById('respondTicketModal')).hide();
          alert(data.message || 'HR response sent successfully!');
          loadHrTickets();
          loadHrStats();
        }
      } catch (e) {
        alert('Network error submitting response.');
      }
    }

    // 7. Load Holidays
    async function loadHrHolidays() {
      const tbody = document.getElementById('hrHolidaysTableBody');
      try {
        const res = await fetch('/api/employee/holidays');
        const data = await res.json();
        if (data.success && data.holidays) {
          tbody.innerHTML = data.holidays.map(h => `
            <tr>
              <td><strong class="text-white">${escapeHtml(h.date)}</strong></td>
              <td><span class="fw-bold text-white">${escapeHtml(h.name)}</span></td>
              <td><span class="text-white-50">${escapeHtml(h.day)}</span></td>
              <td><span class="badge bg-secondary bg-opacity-25 border border-white-10 text-white-50">${escapeHtml(h.type)}</span></td>
              <td class="text-end"><span class="badge bg-primary bg-opacity-25 text-info border border-primary">Official Holiday</span></td>
            </tr>
          `).join('');
        }
      } catch (e) {}
    }

    // Modal Submissions
    async function handleAddEmployee(e) {
      e.preventDefault();
      const payload = {
        full_name: document.getElementById('new-emp-name').value,
        email: document.getElementById('new-emp-email').value,
        designation: document.getElementById('new-emp-desig').value,
        department: document.getElementById('new-emp-dept').value,
        manager_name: document.getElementById('new-emp-manager').value,
        phone: document.getElementById('new-emp-phone').value,
        work_location: document.getElementById('new-emp-location').value,
        joining_date: document.getElementById('new-emp-joining').value
      };

      const btn = document.getElementById('addEmpSubmitBtn');
      btn.disabled = true;

      try {
        const res = await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          bootstrap.Modal.getInstance(document.getElementById('addEmployeeModal')).hide();
          document.getElementById('addEmployeeForm').reset();
          alert(data.message || 'Employee added successfully!');
          loadHrEmployees();
          loadHrTeams();
          loadHrStats();
        } else {
          alert(data.message || 'Error creating employee.');
        }
      } catch (e) {
        alert('Network error registering employee.');
      } finally {
        btn.disabled = false;
      }
    }

    async function handleRegularizeAttendance(e) {
      e.preventDefault();
      const payload = {
        emp_id: document.getElementById('reg-emp-id').value,
        date: document.getElementById('reg-date').value,
        punch_in: document.getElementById('reg-punch-in').value,
        punch_out: document.getElementById('reg-punch-out').value,
        status: document.getElementById('reg-status').value
      };

      try {
        const res = await fetch('/api/hr/attendance/regularize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          bootstrap.Modal.getInstance(document.getElementById('regularizeAttendanceModal')).hide();
          alert(data.message || 'Attendance regularized!');
          loadHrAttendance();
          loadHrStats();
        }
      } catch (e) {
        alert('Error regularizing attendance.');
      }
    }

    function setupDropdownToggle(btnId, menuEl) {
      const btn = document.getElementById(btnId);
      if (!btn || !menuEl) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuEl.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!menuEl.contains(e.target) && !btn.contains(e.target)) {
          menuEl.classList.remove('show');
        }
      });
    }

    function handleLogout() {
      localStorage.removeItem('zyllotech_token');
      localStorage.removeItem('zyllotech_user');
      window.location.href = '/login';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  