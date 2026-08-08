import { TaskRecord, ChecklistItem } from '../pages/AgentWorkspacePage';

export function generateReviewPacketHtml(task: TaskRecord, checklist: ChecklistItem[]): string {
  const completedRequired = checklist.filter(c => c.required && c.completed).length;
  const totalRequired = checklist.filter(c => c.required).length;
  const completionPercentage = Math.round((completedRequired / totalRequired) * 100);
  const isComplete = !task.missingData && completedRequired === totalRequired;

  const validationStatusText = isComplete 
    ? 'Passed - Zero Validation Errors' 
    : 'Warning: Incomplete Required Input Data';

  const missingFieldsText = task.missingData 
    ? 'Current Browsing Context (WebContents Text Snippet Missing)' 
    : 'None';

  const userNoteText = task.notes || 'Approved for hackathon demonstration';
  const reviewStatusText = isComplete ? 'Ready for Review' : 'Needs Attention';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuraOS Agent Task Review Packet - ${task.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background-color: #070a12;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #0d1322;
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 0 50px rgba(6, 182, 212, 0.2);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-b: 1px solid rgba(6, 182, 212, 0.2);
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(34, 211, 238, 0.4);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #22d3ee;
      font-size: 22px;
    }
    .title-group h1 {
      font-size: 22px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .title-group p {
      font-size: 12px;
      color: #38bdf8;
      margin: 2px 0 0;
      font-weight: 600;
    }
    .review-badge {
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'};
      color: ${isComplete ? '#34d399' : '#fb7185'};
      border: 1px solid ${isComplete ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.4)'};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .meta-card {
      background: #070a12;
      border: 1px solid rgba(6, 182, 212, 0.15);
      border-radius: 12px;
      padding: 14px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 28px 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .progress-bar-bg {
      height: 8px;
      background: #070a12;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 24px;
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .progress-bar-fill {
      height: 100%;
      width: ${completionPercentage}%;
      background: linear-gradient(90deg, #06b6d4, #3b82f6);
      border-radius: 9999px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    th, td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(6, 182, 212, 0.15);
    }
    th {
      background: #070a12;
      color: #94a3b8;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tag-complete { color: #34d399; font-weight: 700; }
    .tag-missing { color: #fb7185; font-weight: 700; }
    .tag-optional { color: #fbbf24; font-weight: 700; }
    .box {
      background: #070a12;
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .box-title {
      font-size: 11px;
      font-weight: 800;
      color: #22d3ee;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .plan-list {
      margin: 0;
      padding-left: 20px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .plan-list li {
      margin-bottom: 6px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid rgba(6, 182, 212, 0.2);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { background: #ffffff; color: #0f172a; }
      .container { border: 1px solid #cbd5e1; box-shadow: none; background: #ffffff; }
      .meta-card, .box, th { background: #f8fafc; border-color: #e2e8f0; }
      .title-group h1, .meta-val { color: #0f172a; }
      td, th { border-color: #e2e8f0; color: #334155; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-badge">
        <div class="logo-icon">⚡</div>
        <div class="title-group">
          <h1>AuraOS Agent Task Review Packet</h1>
          <p>Autonomous Intent Engine • Compliance & Validation Audit</p>
        </div>
      </div>
      <div class="review-badge">${reviewStatusText}</div>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Task Title</div>
        <div class="meta-val" style="font-size: 12px;">${task.title}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Task Owner</div>
        <div class="meta-val">${task.owner}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Creation Date / Time</div>
        <div class="meta-val" style="font-size: 11px;">${task.timestamp}</div>
      </div>
    </div>

    <!-- Source Checklist Table -->
    <div class="section-title">
      <span>Source Checklist Verification</span>
      <span style="font-family: monospace;">${completionPercentage}% Required Ready</span>
    </div>

    <div class="progress-bar-bg">
      <div class="progress-bar-fill"></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Input Source Name</th>
          <th>Requirement Type</th>
          <th>Verification Status</th>
        </tr>
      </thead>
      <tbody>
        ${checklist.map(c => `
          <tr>
            <td style="font-weight: 600; color: #f1f5f9;">${c.label}</td>
            <td>${c.required ? 'Required' : 'Optional'}</td>
            <td className="${c.completed ? 'tag-complete' : c.required ? 'tag-missing' : 'tag-optional'}">
              ${c.completed ? '✔ Complete' : c.required ? '✖ Missing' : '⚪ Optional'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Generated Plan / Content -->
    <div class="section-title">Synthesized AuraOS Plan & Environment Rules</div>
    <div class="box">
      <div class="box-title">Configured Environment Rules</div>
      <ul class="plan-list">
        <li><strong>Theme Appearance:</strong> Professional Dark-Blue Theme</li>
        <li><strong>Focus Mode:</strong> Study Mode Active with notification suppression</li>
        <li><strong>Pinned Workspace Quick Links:</strong> GitHub, Kaggle, Google Scholar, LeetCode</li>
        <li><strong>Distraction Domain Blocklist:</strong> instagram.com, facebook.com, x.com, twitter.com</li>
        <li><strong>Live Scorecard Widget:</strong> Cricket Scorecard (India 184/4 — 18.2 overs)</li>
        <li><strong>Page Summarizer:</strong> WebContents 5-Point Article Summarization Enabled</li>
      </ul>
    </div>

    <!-- Validation & Audit Details -->
    <div class="section-title">Validation Audit & Compliance Summary</div>
    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Validation Status</div>
        <div class="meta-val" style="color: ${isComplete ? '#34d399' : '#fb7185'}; font-size: 11px;">
          ${validationStatusText}
        </div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Missing Data Fields</div>
        <div class="meta-val" style="font-size: 11px;">${missingFieldsText}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Final Review Status</div>
        <div class="meta-val" style="color: ${isComplete ? '#38bdf8' : '#fbbf24'}; font-size: 12px;">
          ${reviewStatusText}
        </div>
      </div>
    </div>

    <!-- User Notes -->
    <div class="box">
      <div class="box-title">User Review Note</div>
      <div style="font-size: 12px; color: #cbd5e1; font-style: italic;">
        "${userNoteText}"
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>AuraOS Desktop Engine • Verified Compliance Packet</span>
      <span>Exported: ${new Date().toLocaleString()}</span>
    </div>
  </div>
</body>
</html>`;
}

export function downloadReviewPacketFile(filename: string, htmlContent: string) {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
