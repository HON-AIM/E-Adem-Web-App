        async function loadApplications() {
             try {
                const res = await fetch('/api/admin/applications');
                const apps = await res.json();
                
                const escapeHtml = (unsafe) => {
                        return (unsafe || "")
                             .replace(/&/g, "&amp;")
                             .replace(/</g, "&lt;")
                             .replace(/>/g, "&gt;")
                             .replace(/"/g, "&quot;")
                             .replace(/'/g, "&#039;");
                };

                const tbody = document.querySelector('#apps-table tbody');
                tbody.innerHTML = apps.map(app => {
                    let detailsHtml = '';
                    if (app.details) {
                        if (app.details.amount) detailsHtml += `<div>Amount: ₦${parseInt(app.details.amount).toLocaleString()}</div>`;
                        if (app.details.duration) detailsHtml += `<div>Duration: ${escapeHtml(app.details.duration)}</div>`;
                        if (app.details.purpose) detailsHtml += `<div>Purpose: ${escapeHtml(app.details.purpose)}</div>`;
                    }
                    
                    let statusBadge = 'status-pending';
                    if (app.status === 'Approved') statusBadge = 'status-success';
                    if (app.status === 'Rejected') statusBadge = 'status-failed';

                    // Actions
                    let actionsHtml = '';
                    if (app.status === 'Pending') {
                        actionsHtml = `
                            <button class="btn btn-sm btn-primary" onclick="appAction('${app._id}', 'approve')">Approve</button>
                            <button class="btn btn-sm btn-outline-primary" style="color:red; border-color:red" onclick="appAction('${app._id}', 'reject')">Reject</button>
                        `;
                    } else {
                        actionsHtml = `<span style="color:#64748b; font-size:0.8rem">Completed</span>`;
                    }

                    return `
                    <tr>
                        <td>
                            <div style="font-weight:600">${escapeHtml(app.fullName)}</div>
                            <div style="font-size:0.8rem; color:#64748b">${app.email}</div>
                        </td>
                        <td><span class="status-badge status-pending" style="background:#e0f2fe; color:#0284c7">${app.type}</span></td>
                        <td>${detailsHtml}</td>
                        <td><span class="status-badge ${statusBadge}">${app.status}</span></td>
                         <td>${new Date(app.createdAt).toLocaleDateString()}</td>
                        <td style="display:flex; gap:5px">${actionsHtml}</td>
                    </tr>
                    `
                }).join('');

             } catch(e) {
                 console.error(e);
                 document.querySelector('#apps-table tbody').innerHTML = '<tr><td colspan="6">Error loading applications</td></tr>';
             }
        }

        async function appAction(applicationId, action) {
            if (!confirm(`Are you sure you want to ${action.toUpperCase()} this application?`)) return;
            
            try {
                const res = await fetch('/api/admin/application-action', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ applicationId, action })
                });
                const result = await res.json();
                alert(result.message);
                loadApplications(); // Refresh list
            } catch (e) {
                alert('Action failed');
            }
        }
