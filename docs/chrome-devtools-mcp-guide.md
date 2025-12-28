# Chrome DevTools MCP: Comprehensive Guide for Claude Code

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Available Tools (26 Tools Across 6 Categories)](#available-tools-26-tools-across-6-categories)
4. [Connection Methods](#connection-methods)
5. [Snapshot vs Screenshot: When to Use Each](#snapshot-vs-screenshot-when-to-use-each)
6. [Authentication Flows](#authentication-flows)
7. [Common Workflows & Patterns](#common-workflows--patterns)
8. [Best Practices](#best-practices)
9. [Limitations & Gotchas](#limitations--gotchas)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)
12. [Practical Examples](#practical-examples)

---

## Overview

Chrome DevTools MCP is an official Model Context Protocol (MCP) server from Google that connects AI coding assistants (Claude, Cursor, Gemini, Copilot) to Chrome's full debugging capabilities. It solves a fundamental problem: AI agents cannot see what their generated code actually does when it runs in the browser—they're effectively programming with a blindfold on.

**Released:** September 23, 2025 (Public Preview)

**Key Capabilities:**
- Real-time code verification in the browser
- Network and console diagnostics (CORS, errors, etc.)
- User behavior simulation (navigation, form filling, clicks)
- Live styling and layout debugging
- Performance auditing with Chrome DevTools traces

**Technology Stack:**
- Built on Puppeteer for reliable browser automation
- Exposes Chrome DevTools Protocol (CDP) through MCP
- Requires Node.js v20.19+ and modern Chrome

---

## Installation & Setup

### Quick Setup for Claude Code

```bash
# Add Chrome DevTools MCP server
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest

# Restart Claude Code to load the server
```

### Manual Configuration (JSON)

For other MCP clients or manual setup, add to your MCP configuration:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

### Requirements

- **Node.js:** v20.19 or later
- **Chrome:** Current stable version or newer
- **npm:** Latest stable version

### Verify Installation

Test the server independently:

```bash
npx chrome-devtools-mcp@latest --help
```

### First Test Prompt

Once configured, test with:

```
Check the performance of https://developers.chrome.com
```

The browser launches automatically when tools requiring it are invoked.

---

## Available Tools (26 Tools Across 6 Categories)

### 1. Input Automation (8 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `click` | Click or double-click elements | `click` button with uid from snapshot |
| `drag` | Drag one element onto another | Drag file onto upload area |
| `fill` | Type text into inputs or select options | Fill username field |
| `fill_form` | Fill multiple form fields at once | Complete entire login form |
| `handle_dialog` | Accept or dismiss browser dialogs | Handle confirm/alert/prompt dialogs |
| `hover` | Trigger hover effects | Show dropdown menu on hover |
| `press_key` | Press keys or key combinations | `Enter`, `Control+A`, `Control+Shift+R` |
| `upload_file` | Upload files through input elements | Upload image to form |

**Note:** Elements are identified by their **uid** from snapshots (see Snapshot vs Screenshot section).

### 2. Navigation Automation (6 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `navigate_page` | Navigate to URL, back, forward, or reload | Load `https://example.com` |
| `new_page` | Open a new browser tab/page | Open parallel test page |
| `list_pages` | List all open pages | See all tabs and their indices |
| `select_page` | Switch context to a different page | Focus on page index 2 |
| `close_page` | Close a page by index | Close tab 3 |
| `wait_for` | Wait for specific text to appear | Wait for "Success" message |

### 3. Debugging (5 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `take_snapshot` | Get text-based DOM snapshot from a11y tree | See page structure with uids |
| `take_screenshot` | Capture visual screenshot (PNG/JPEG/WebP) | Verify layout visually |
| `evaluate_script` | Execute JavaScript in page context | Extract data or modify DOM |
| `list_console_messages` | View console output (logs, errors, warnings) | Check for JavaScript errors |
| `get_console_message` | Get detailed info about specific message | Inspect error stack trace |

### 4. Network (2 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `list_network_requests` | List HTTP requests with filtering | See all XHR/fetch requests |
| `get_network_request` | Get detailed request/response data | Inspect API call payload |

**Filtering:** Support for resource types (document, stylesheet, image, xhr, fetch, etc.), pagination, and preserving requests across navigations.

### 5. Performance (3 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `performance_start_trace` | Begin recording performance trace | Start profiling page load |
| `performance_stop_trace` | Stop trace and get insights | Get Core Web Vitals |
| `performance_analyze_insight` | Deep dive into specific insight | Analyze LCP breakdown |

**Provides:** Core Web Vitals (LCP, CLS, INP), performance bottlenecks, actionable optimization insights.

### 6. Emulation (2 tools)

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `emulate` | Emulate CPU, network, or geolocation | Throttle to "Slow 4G" |
| `resize_page` | Set page viewport dimensions | Test at 375x667 (mobile) |

**Network Options:** No emulation, Offline, Slow 3G, Fast 3G, Slow 4G, Fast 4G
**CPU Throttling:** 1x (none) to 20x slowdown

---

## Connection Methods

Chrome DevTools MCP supports three connection methods:

### 1. Automatic Connection (Default)

The MCP server launches and manages its own Chrome instance.

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@latest"]
}
```

**Pros:**
- Zero setup—works immediately
- Isolated from your personal browsing
- Clean state for each session

**Cons:**
- Cannot access authenticated sites
- No persistent cookies/sessions
- Separate from your daily-use Chrome

### 2. Auto-Connect (Chrome 144+)

New feature allowing MCP to request debugging connection from running Chrome.

**Setup:**
1. Enable in Chrome (≥144): Navigate to `chrome://inspect/#remote-debugging`
2. Configure MCP:

```json
{
  "command": "npx",
  "args": [
    "chrome-devtools-mcp@latest",
    "--autoConnect",
    "--channel=beta"
  ]
}
```

**Pros:**
- Best for sharing state between manual and AI-driven testing
- Permission-based (Chrome shows dialog)

**Cons:**
- Requires Chrome 144+ (currently in Beta/Dev channels)

### 3. Manual Connection via Remote Debugging Port

Launch Chrome with debugging enabled, then connect MCP to it.

**Step 1: Start Chrome with debugging**

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"
```

**Windows:**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\Temp\chrome-profile-stable"
```

**Step 2: Configure MCP**

For Claude Code:
```bash
claude mcp add --transport stdio chrome-devtools -- \
  npx -y chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222
```

JSON configuration:
```json
{
  "command": "npx",
  "args": [
    "chrome-devtools-mcp@latest",
    "--browser-url=http://127.0.0.1:9222"
  ]
}
```

**Verify connection:**
Visit `http://127.0.0.1:9222` in another browser—you should see JSON with debugging endpoints.

**Pros:**
- Supports authenticated workflows (see Authentication section)
- Full control over Chrome flags and profile
- Can debug your actual browser session

**Cons:**
- Manual setup required
- Security risk if port exposed to network
- Must restart Chrome with correct flags

### 4. WebSocket Direct Connection

Connect to specific WebSocket endpoint with optional auth headers.

```json
{
  "command": "npx",
  "args": [
    "chrome-devtools-mcp@latest",
    "--wsEndpoint=ws://127.0.0.1:9222/devtools/browser/<id>",
    "--wsHeaders={\"Authorization\":\"Bearer YOUR_TOKEN\"}"
  ]
}
```

**Get WebSocket URL:** Visit `http://127.0.0.1:9222/json/version` and copy `webSocketDebuggerUrl`.

---

## Snapshot vs Screenshot: When to Use Each

### Snapshot (`take_snapshot`)

**What it is:**
- Text-based representation of the page from the accessibility (a11y) tree
- Lists interactive elements with unique IDs (uids)
- Shows semantic structure (roles, labels, hierarchy)
- Similar to how screen readers understand pages

**Example Output:**
```
[1] button "Sign In"
[2] textbox "Email address"
[3] textbox "Password"
[4] link "Forgot password?"
```

**When to use:**
- **Finding elements to interact with** (click, fill, etc.)
- **Understanding page structure** without visual clutter
- **Checking accessibility** of the page
- **Faster/cheaper** than screenshots (text-based)
- **Required for interactions** (uids come from snapshots)

**Advantages:**
- Fast and lightweight
- Focuses on semantically meaningful elements
- Provides interaction targets (uids)
- Works well for forms, navigation, content analysis

**Verbose mode:**
```
take_snapshot --verbose
```
Includes all accessibility tree information.

### Screenshot (`take_screenshot`)

**What it is:**
- Visual image of rendered page (PNG/JPEG/WebP)
- Captures exactly what users see
- Can screenshot full page or specific elements

**Options:**
```javascript
// Full viewport
take_screenshot()

// Full page (scrolls to capture everything)
take_screenshot --fullPage

// Specific element by uid
take_screenshot --uid=42

// Save to file
take_screenshot --filePath=/path/to/save.png

// JPEG with quality control
take_screenshot --format=jpeg --quality=85
```

**When to use:**
- **Visual verification** (layout, styling, positioning)
- **Debugging CSS issues** (alignment, colors, spacing)
- **Confirming correct rendering** before proceeding
- **Documenting bugs** or test results
- **When snapshot lacks visual context**

**Advantages:**
- Shows actual rendered appearance
- Catches visual bugs (CSS, images, fonts)
- Great for validation and debugging
- Can capture element-specific screenshots

### Decision Matrix

| Task | Use Snapshot | Use Screenshot |
|------|--------------|----------------|
| Find form fields to fill | ✅ | ❌ |
| Click a button | ✅ (need uid) | ❌ |
| Verify button alignment | ❌ | ✅ |
| Check for JavaScript errors in console | ✅ (use `list_console_messages`) | ❌ |
| Confirm modal dialog appeared | ❌ | ✅ |
| Extract text content | ✅ | ❌ |
| Verify color scheme | ❌ | ✅ |
| Test responsive layout | ❌ | ✅ |
| Navigate through form flow | ✅ | Maybe (for verification) |

### Best Practice Workflow

**Recommended pattern:**

1. **Take snapshot** to understand page structure and get uids
2. **Interact** with elements using uids from snapshot
3. **Take screenshot** to verify the result visually
4. **Check console** for errors using `list_console_messages`

**Example:**
```
1. take_snapshot() → see login form structure, get uid for email field
2. fill(uid=2, value="user@example.com") → enter email
3. fill(uid=3, value="password123") → enter password
4. click(uid=1) → click submit button
5. take_screenshot() → verify success page appeared
6. list_console_messages() → check for errors
```

**Cost consideration:** Snapshots are text-based and cheaper to process than images. Use screenshots when visual confirmation is necessary, but prefer snapshots for element discovery and interaction.

---

## Authentication Flows

### The Authentication Problem

**Default behavior:** Chrome DevTools MCP launches isolated Chrome instances with empty profiles. No cookies, no sessions, no saved logins.

**Modern restriction:** Chrome 136+ blocks remote debugging on default profiles for security.

**Solution:** Use `--user-data-dir` flag to create a persistent debug profile that maintains authentication between sessions.

### Setup for Authenticated Testing

#### Step 1: Create Shell Alias (Recommended)

Add to `~/.zshrc` or `~/.bashrc`:

```bash
# macOS
alias chrome:debug="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=\"$HOME/.chrome-debug-profile\" \
  > /dev/null 2>&1 &"

# Windows (PowerShell)
function chrome:debug {
  & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
    --remote-debugging-port=9222 `
    --user-data-dir="C:\Users\$env:USERNAME\.chrome-debug-profile"
}
```

Reload shell config:
```bash
source ~/.zshrc
```

#### Step 2: Launch Debug Chrome

```bash
chrome:debug
```

Chrome opens with debugging enabled. The profile is stored at the specified path.

#### Step 3: Configure Claude Code MCP

```bash
claude mcp add --transport stdio chrome-devtools -- \
  npx -y chrome-devtools-mcp@latest --browserUrl=http://127.0.0.1:9222
```

Restart Claude Code.

#### Step 4: Log Into Services

In the debug Chrome instance, manually log into the services you need to automate:

- Twitter/X
- LinkedIn
- GitHub
- Internal tools
- Banking/financial sites (not recommended—see Security)
- SaaS platforms

**Important:** These logins persist across sessions because of `--user-data-dir`.

#### Step 5: Test Authenticated Workflow

Example prompts:

```
Navigate to github.com and check my notifications.
Summarize any pull requests that need my attention.
```

```
Go to my Twitter timeline and screenshot the top 5 posts.
Summarize the most interesting tweets I should read.
```

```
Navigate to LinkedIn and find [person's name]'s profile.
Provide a summary of their background and recent activity.
```

### Alternative: WebDriver Restrictions

Some sites block automated sign-ins when detecting WebDriver (Puppeteer's default launch mechanism).

**Workaround:** Launch Chrome manually before connecting MCP (as shown above). This avoids WebDriver flags.

### Session Persistence

**How it works:**
- `--user-data-dir` tells Chrome where to store cookies, session tokens, and profile data
- Chrome creates this directory if it doesn't exist
- Same path = same profile = persistent logins
- Different paths = isolated profiles

**Profile locations:**
```bash
# Development profile
--user-data-dir="$HOME/.chrome-debug-profile"

# Testing profile (separate from dev)
--user-data-dir="$HOME/.chrome-test-profile"

# Temporary profile (clean up after)
--user-data-dir="/tmp/chrome-temp-$(date +%s)"
```

---

## Common Workflows & Patterns

### 1. Performance Testing (Core Web Vitals)

**Goal:** Measure and optimize page performance with real-world conditions.

**Workflow:**

```javascript
// 1. Navigate to page
navigate_page("https://yoursite.com")

// 2. Apply network throttling (simulate mobile 4G)
emulate({
  networkConditions: "Slow 4G",
  cpuThrottlingRate: 4
})

// 3. Start performance trace with page reload
performance_start_trace({
  reload: true,
  autoStop: true
})

// 4. Get performance insights
// Trace stops automatically, results include:
// - Largest Contentful Paint (LCP)
// - Cumulative Layout Shift (CLS)
// - Interaction to Next Paint (INP)
// - First Contentful Paint (FCP)
// - Time to First Byte (TTFB)

// 5. Analyze specific insights
performance_analyze_insight({
  insightSetId: "<from trace results>",
  insightName: "LCPBreakdown"
})

// 6. Test interactions for INP
click(uid=<button-from-snapshot>)

// 7. Take screenshot for visual confirmation
take_screenshot()
```

**Common performance issues detected:**
- Unoptimized images causing slow LCP
- Layout shifts from dynamically loaded content (CLS)
- Render-blocking CSS/JS
- Slow server response times (TTFB)

### 2. Form Automation & Testing

**Goal:** Fill out complex forms and validate submission.

**Workflow:**

```javascript
// 1. Navigate and take snapshot
navigate_page("https://app.example.com/signup")
take_snapshot()

// 2. Fill form (single field approach)
fill(uid=1, value="John Doe")
fill(uid=2, value="john@example.com")
fill(uid=3, value="SecurePass123!")

// OR fill entire form at once
fill_form({
  elements: [
    { uid: 1, value: "John Doe" },
    { uid: 2, value: "john@example.com" },
    { uid: 3, value: "SecurePass123!" },
    { uid: 4, value: "United States" } // dropdown
  ]
})

// 3. Take screenshot before submission
take_screenshot()

// 4. Submit form
click(uid=5) // Submit button

// 5. Wait for success message
wait_for("Registration successful")

// 6. Verify no errors
list_console_messages({ types: ["error", "warn"] })

// 7. Check network response
list_network_requests({ resourceTypes: ["xhr", "fetch"] })
get_network_request(reqid=<from list>)
```

**Edge cases to test:**
- Empty fields (validation messages)
- Invalid email formats
- Password strength requirements
- CAPTCHA handling (may require manual intervention)
- File uploads (use `upload_file` tool)

### 3. Network Debugging (CORS, API Failures)

**Goal:** Diagnose why API calls or resources are failing.

**Workflow:**

```javascript
// 1. Navigate to page with issue
navigate_page("https://app.example.com")

// 2. Reproduce the action that triggers network calls
click(uid=<button-that-fetches-data>)

// 3. List network requests filtered by type
list_network_requests({
  resourceTypes: ["xhr", "fetch"],
  pageSize: 50
})

// 4. Inspect failed requests
get_network_request(reqid=<failed-request-id>)
// Returns: status code, headers, request/response bodies, timing

// 5. Check console for CORS errors
list_console_messages({ types: ["error"] })

// 6. Get detailed error
get_console_message(msgid=<error-message-id>)
```

**Common issues detected:**
- CORS errors (missing Access-Control-Allow-Origin)
- 404/500 status codes
- Authentication failures (401/403)
- Request payload issues (400 Bad Request)
- Timeout errors

**AI can suggest fixes:**
- "Images failing due to CORS; enable appropriate headers on server"
- "API returns 401; check authentication token"
- "Request missing required field 'userId' in payload"

### 4. Automated Test Case Execution

**Goal:** Convert human-readable test cases to automated browser tests.

**Example Test Case (Markdown):**

```markdown
## Test Case: User Login
1. Navigate to https://app.example.com/login
2. Enter email: test@example.com
3. Enter password: TestPass123!
4. Click "Sign In" button
5. Verify dashboard page loads
6. Confirm user name appears in header
```

**Automated Workflow:**

```javascript
// AI reads test case and executes:

// Step 1
navigate_page("https://app.example.com/login")
take_snapshot()

// Steps 2-3
fill_form({
  elements: [
    { uid: 1, value: "test@example.com" },
    { uid: 2, value: "TestPass123!" }
  ]
})

// Step 4
click(uid=3) // Sign In button

// Step 5
wait_for("Dashboard")

// Step 6
take_snapshot()
// Verify: snapshot contains text "Welcome, Test User"

take_screenshot() // Visual confirmation
```

**Advantages over traditional test frameworks:**
- No code required—just natural language test cases
- AI adapts to UI changes (finds buttons by label, not hardcoded selectors)
- Rapid prototyping and iteration
- Can convert to Playwright/Selenium later for production

### 5. Mobile/Responsive Testing

**Goal:** Test layouts and functionality across device sizes.

**Workflow:**

```javascript
// 1. Test mobile viewport
resize_page({ width: 375, height: 667 }) // iPhone SE
take_screenshot()

// 2. Test tablet
resize_page({ width: 768, height: 1024 }) // iPad
take_screenshot()

// 3. Test desktop
resize_page({ width: 1920, height: 1080 })
take_screenshot()

// 4. Test landscape mobile
resize_page({ width: 667, height: 375 })
take_screenshot()

// 5. Test with network throttling (mobile conditions)
emulate({
  networkConditions: "Slow 3G",
  cpuThrottlingRate: 4
})

// 6. Verify touch targets (via snapshot)
take_snapshot()
// Check: button sizes, spacing for mobile usability

// 7. Test specific mobile interactions
click(uid=<hamburger-menu>)
take_screenshot() // Verify menu opened
```

**Common mobile issues detected:**
- Text too small (accessibility)
- Buttons too close together (touch targets)
- Horizontal scrolling on mobile
- Fixed elements covering content
- Images not responsive

### 6. Visual Regression Testing

**Goal:** Catch unintended UI changes.

**Workflow:**

```javascript
// 1. Baseline: Take screenshots of key pages
const pages = [
  "https://app.example.com/",
  "https://app.example.com/pricing",
  "https://app.example.com/about"
]

for (const page of pages) {
  navigate_page(page)
  take_screenshot({
    filePath: `/baselines/${page.replace(/[^a-z0-9]/gi, '_')}.png`
  })
}

// 2. After changes: Take new screenshots
for (const page of pages) {
  navigate_page(page)
  take_screenshot({
    filePath: `/current/${page.replace(/[^a-z0-9]/gi, '_')}.png`
  })
}

// 3. Compare (use external tool or AI vision)
// AI can analyze: "Compare these two screenshots and list differences"
```

**Alternative: Snapshot-based regression**
```javascript
// Store snapshot text for comparison
take_snapshot()
// Compare snapshot text between versions
// Detects: added/removed elements, text changes, structure changes
```

### 7. Debugging Layout Shift (CLS)

**Goal:** Find and fix elements causing layout instability.

**Workflow:**

```javascript
// 1. Emulate mobile (where CLS often worse)
resize_page({ width: 375, height: 667 })

// 2. Start performance trace
performance_start_trace({
  reload: true,
  autoStop: true
})

// 3. Analyze CLS insight
performance_analyze_insight({
  insightSetId: "<from trace>",
  insightName: "CumulativeLayoutShift"
})
// Returns: elements causing shifts, timestamps, severity

// 4. Take snapshot to inspect problematic elements
take_snapshot({ verbose: true })
// Look for: images without dimensions, dynamic content, fonts loading

// 5. Take screenshots at different load stages
// (May require manual trace with screenshots at intervals)

// 6. Evaluate CSS of shifting elements
evaluate_script(`
  const el = document.querySelector('[data-element]');
  return {
    computed: window.getComputedStyle(el),
    dimensions: {
      width: el.offsetWidth,
      height: el.offsetHeight
    }
  };
`)
```

**Common CLS causes:**
- Images/videos without explicit width/height
- Ads or embeds inserted dynamically
- Web fonts causing text reflow (FOIT/FOUT)
- Animations that shift content
- Missing dimensions on dynamic content

---

## Best Practices

### 1. Prefer Snapshots for Element Discovery

**Why:** Snapshots are faster, cheaper, and provide interaction targets (uids).

```javascript
// Good: Snapshot first, then interact
take_snapshot()
fill(uid=2, value="email@example.com")

// Avoid: Screenshot for element finding (slower, no uids)
take_screenshot() // Can't get uids from images
```

### 2. Use Screenshots for Visual Verification

**Why:** Confirm the UI looks correct before proceeding.

```javascript
// After critical actions
click(uid=5) // Submit button
take_screenshot() // Verify success page rendered correctly
```

### 3. Check Console and Network After Errors

**Why:** Get diagnostic data to understand failures.

```javascript
// When something fails
list_console_messages({ types: ["error", "warn"] })
list_network_requests({ resourceTypes: ["xhr", "fetch"] })
get_network_request(reqid=<failed-request>)
```

### 4. Use Isolated Profiles for Testing

**Why:** Avoid contaminating your personal browser data.

```bash
# Good: Separate profile for testing
--user-data-dir="$HOME/.chrome-test-profile"

# Avoid: Using default profile (blocked in Chrome 136+)
# No --user-data-dir flag
```

### 5. Apply Realistic Emulation for Performance Testing

**Why:** Real users experience throttled networks and slower devices.

```javascript
// Simulate mobile 4G user
emulate({
  networkConditions: "Slow 4G",
  cpuThrottlingRate: 4
})

// Test on mobile viewport
resize_page({ width: 375, height: 667 })
```

### 6. Wait for Elements/Text Before Interacting

**Why:** Avoid race conditions and flaky tests.

```javascript
// Good: Wait for element to appear
wait_for("Login successful")
take_snapshot()
click(uid=<next-button>)

// Avoid: Clicking immediately (may not be ready)
click(uid=<next-button>) // Might fail if button not loaded
```

### 7. Use `fill_form` for Multiple Fields

**Why:** Faster and more reliable than individual `fill` calls.

```javascript
// Good: Fill all fields at once
fill_form({
  elements: [
    { uid: 1, value: "John" },
    { uid: 2, value: "Doe" },
    { uid: 3, value: "john@example.com" }
  ]
})

// Avoid: Multiple separate fills (slower)
fill(uid=1, value="John")
fill(uid=2, value="Doe")
fill(uid=3, value="john@example.com")
```

### 8. Save Screenshots to Files for Documentation

**Why:** Keep visual records of test results.

```javascript
take_screenshot({
  filePath: "/tests/results/login-success.png",
  format: "png"
})
```

### 9. Use `evaluate_script` for Data Extraction

**Why:** Get structured data from the page for analysis.

```javascript
// Extract all links
evaluate_script(`
  () => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent,
      href: a.href
    }));
  }
`)

// Get computed styles
evaluate_script(`
  () => {
    const el = document.querySelector('.hero');
    return window.getComputedStyle(el);
  }
`)
```

### 10. Master Manual DevTools First

**Why:** AI assists human expertise; it doesn't replace it.

Before using Chrome DevTools MCP effectively:
- Understand the Performance tab and how to read traces
- Know how to use the Network tab for debugging
- Be familiar with console debugging and error messages
- Understand CORS, HTTP status codes, and web fundamentals

**Goal:** Make debugging skills more efficient, not replace them.

### 11. Use Headless Mode for CI/CD

**Why:** Faster execution without GUI overhead.

```json
{
  "command": "npx",
  "args": [
    "chrome-devtools-mcp@latest",
    "--headless"
  ]
}
```

**Note:** Set to `false` for visual debugging during development.

### 12. Clean Up Temporary Profiles

**Why:** Avoid disk space bloat.

```bash
# Use isolated mode for auto-cleanup
--isolated

# Or manually clean up
rm -rf /tmp/chrome-temp-*
```

---

## Limitations & Gotchas

### 1. Sandbox Restrictions

**Issue:** Some MCP clients enable OS sandboxing (macOS Seatbelt, Linux containers). Chrome cannot create its own sandboxes within a sandbox.

**Workaround:**
- Disable MCP sandboxing, OR
- Use `--browser-url` to connect to externally-launched Chrome

### 2. Default Profile Blocked (Chrome 136+)

**Issue:** Chrome blocks remote debugging on your default profile for security.

**Solution:** Always use `--user-data-dir` with a separate profile.

```bash
# Required for Chrome 136+
--user-data-dir="$HOME/.chrome-debug-profile"
```

### 3. WebDriver Detection

**Issue:** Some sites block automation when detecting WebDriver flags.

**Workaround:** Launch Chrome manually before connecting MCP (avoids WebDriver detection).

### 4. Port 9222 Security Risk

**Issue:** Remote debugging port allows full browser control.

**Mitigation:**
- Only bind to `127.0.0.1` (localhost)
- Never expose to untrusted networks
- Use firewall rules to block external access
- Close Chrome when finished (closes port automatically)

### 5. Node Version Mismatch

**Issue:** MCP client and terminal may use different Node versions.

**Solution:**
- Ensure consistent Node version (v20.19+)
- Check with `node --version`
- Use `nvm` to manage Node versions

### 6. NPM Cache Corruption

**Issue:** `ERR_MODULE_NOT_FOUND` errors, especially with `npx`.

**Solution:**
```bash
rm -rf ~/.npm/_npx
npm cache clean --force
npx chrome-devtools-mcp@latest --help # Test
```

**Alternative:** Use `pnpx` instead of `npx`:
```json
{
  "command": "pnpx",
  "args": ["chrome-devtools-mcp@latest"]
}
```

### 7. Windows Chrome Executable Path Issues

**Issue:** MCP looks for Chrome in `Local AppData`, not `Program Files`.

**Solution:** Create symlink to expected location:

```powershell
# Run as Administrator
mklink "C:\Users\<username>\AppData\Local\Google\Chrome\Application\chrome.exe" `
       "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

**Or:** Use `--executablePath` flag:
```json
{
  "args": [
    "chrome-devtools-mcp@latest",
    "--executablePath=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  ]
}
```

### 8. VM-to-Host Remote Debugging Failure

**Issue:** Chrome rejects connections from VMs due to host header validation.

**Solution:** SSH tunnel from VM to host:

```bash
# In VM, run:
ssh -N -L 127.0.0.1:9222:127.0.0.1:9222 <user>@<host-ip>
```

Then connect MCP to `http://127.0.0.1:9222` (tunneled through SSH).

### 9. Incremental Development Status

**Issue:** Chrome DevTools MCP is in public preview—some features are still being built.

**Solution:**
- Check GitHub issues for known limitations
- File issues for missing capabilities
- Contribute feedback to the project

**Missing features will be added based on community input.**

### 10. Timeout Issues (Windows)

**Issue:** MCP cannot attach to Chrome; no WebSocket on port 9222.

**Solution:**
- Ensure Chrome launched with `--remote-debugging-port=9222`
- Verify port is open: `netstat -an | findstr 9222`
- Check firewall isn't blocking localhost connections
- Close all Chrome instances and restart with correct flags

### 11. Target Closed Error

**Issue:** Browser fails to start or crashes immediately.

**Solutions:**
- Terminate all running Chrome instances
- Verify latest stable Chrome is installed
- Check system meets Chrome requirements (disk space, memory)
- Try `--no-sandbox` flag (not recommended for production)

### 12. Puppeteer Module Not Found (Cursor)

**Issue:** Cursor shows "No tools, prompts, or resources" after installing MCP.

**Cause:** Puppeteer-core v23+ changed ESM entry point; npx cache issues.

**Solution:** Use `pnpx` instead of `npx`:

```json
{
  "chrome-devtools": {
    "command": "pnpx",
    "args": ["chrome-devtools-mcp@latest"]
  }
}
```

### 13. Can't Interact with Elements Not in A11y Tree

**Issue:** Snapshot only shows accessibility tree—purely decorative elements are excluded.

**Workaround:**
- Use `evaluate_script` to interact with DOM directly
- Use `take_screenshot` to visually confirm element exists
- Modify page HTML to add accessible roles

---

## Troubleshooting

### General Debugging

**Enable verbose logging:**

```bash
DEBUG=* npx chrome-devtools-mcp@latest --log-file=/path/to/chrome-devtools-mcp.log
```

**Test server independently:**

```bash
npx chrome-devtools-mcp@latest --help
```

**Check connection:**

Visit `http://127.0.0.1:9222` in browser—should show JSON with endpoints.

**Verify Chrome is running with debug port:**

```bash
# macOS/Linux
lsof -i :9222

# Windows
netstat -an | findstr 9222
```

### Common Error Messages

#### "Module not found"

**Cause:** Node version mismatch or corrupted npm cache.

**Solution:**
```bash
# Clear npm cache
rm -rf ~/.npm/_npx
npm cache clean --force

# Verify Node version
node --version # Should be v20.19+

# Reinstall
npx chrome-devtools-mcp@latest --help
```

#### "Target closed"

**Cause:** Chrome failed to start or crashed.

**Solution:**
- Close all Chrome instances
- Update to latest Chrome stable
- Try launching Chrome manually first
- Check system resources (memory, disk space)

#### "Cannot connect to browser"

**Cause:** Chrome not running with debug port, or wrong URL.

**Solution:**
- Verify Chrome launched with `--remote-debugging-port=9222`
- Check port is open (see above)
- Confirm `--browser-url` matches port (e.g., `http://127.0.0.1:9222`)
- Try restarting Chrome

#### "No tools, prompts or resources" (Cursor)

**Cause:** Puppeteer module path issue with npx.

**Solution:** Switch to `pnpx`:
```json
{
  "command": "pnpx",
  "args": ["chrome-devtools-mcp@latest"]
}
```

#### "Port already in use"

**Cause:** Another process using port 9222.

**Solution:**
```bash
# Find process
lsof -i :9222  # macOS/Linux
netstat -ano | findstr 9222  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
--remote-debugging-port=9223
```

### VM/Remote Issues

**Problem:** Connection fails from VM to host Chrome.

**Solution:** SSH tunnel (see Limitations section #8).

### Performance Issues

**Problem:** Slow response, timeouts.

**Solutions:**
- Close unused tabs in Chrome
- Reduce trace duration
- Use `--headless` mode
- Filter network requests by type
- Limit `pageSize` in list operations

### File Not Found Errors

**Problem:** Can't find Chrome executable.

**Solution:**
```json
{
  "args": [
    "chrome-devtools-mcp@latest",
    "--executablePath=/path/to/chrome"
  ]
}
```

**Common paths:**
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Linux: `/usr/bin/google-chrome` or `/usr/bin/chromium-browser`

---

## Security Considerations

### 1. Never Use Chrome DevTools MCP with Sensitive Data

**Risk:** The debugging protocol exposes ALL browser content to MCP clients:
- Cookies
- Session storage
- Local storage
- Form data
- Network requests/responses
- JavaScript execution

**Mitigation:**
- Use isolated profiles (`--user-data-dir`)
- Never browse banking, email, or personal accounts in debug Chrome
- Keep minimal personal data in debug profiles
- Separate dev/test profiles from production

### 2. Port 9222 Allows Remote Code Execution

**Risk:** Anyone with access to port 9222 can fully control Chrome:
- Execute arbitrary JavaScript
- Access all page data
- Navigate to any URL
- Download files
- Modify cookies

**Mitigation:**
- Only bind to `127.0.0.1` (localhost)
- Never expose port to internet or untrusted networks
- Use firewall rules to block external access
- Close Chrome when not actively debugging

### 3. Avoid Sharing Debug Profiles

**Risk:** Debug profiles may contain:
- Saved passwords
- Autofill data
- Browsing history
- Cached files

**Mitigation:**
- Use temporary profiles for CI/CD (`--isolated`)
- Don't commit profile directories to git
- Clean up profiles after testing
- Use separate profiles for each project/user

### 4. Be Careful with Screenshot/Snapshot Data

**Risk:** Screenshots may capture sensitive information:
- Personal data
- API keys in UI
- Internal URLs
- Proprietary designs

**Mitigation:**
- Review screenshots before sharing
- Save to secure locations only
- Delete after testing
- Use environment-specific test data (not production)

### 5. Sandbox Escapes

**Risk:** Chrome's sandbox prevents malicious code from escaping the browser. Debugging may weaken sandboxing.

**Mitigation:**
- Only debug trusted code/sites
- Keep Chrome updated (security patches)
- Don't disable sandbox flags unless necessary
- Run in isolated VMs for untrusted sites

### 6. Development vs. Production

**Recommendations:**
- **Development:** Use debug profiles with manual logins
- **Testing:** Use temporary profiles (`--isolated`) with test accounts
- **CI/CD:** Headless mode with minimal credentials
- **Production:** Never use Chrome DevTools MCP with production data

### 7. Credentials Management

**Best Practices:**
- Use test accounts only (never real user accounts)
- Store credentials in secure vaults (1Password, LastPass)
- Rotate test credentials regularly
- Don't hardcode passwords in test scripts
- Use environment variables for sensitive data

### 8. Network Exposure

**Checklist:**
- [ ] Port 9222 only bound to `127.0.0.1`
- [ ] Firewall blocks external access to port
- [ ] VPN/SSH tunnel for remote debugging
- [ ] No public IP exposure of debug port
- [ ] Close Chrome when finished (closes port)

### 9. Audit Trail

**Recommendations:**
- Log all MCP interactions
- Review debug logs regularly
- Monitor for unauthorized access attempts
- Track which team members use debug profiles
- Rotate profiles periodically

### 10. Legal/Compliance Considerations

**Important:**
- Don't test on production systems without authorization
- Respect robots.txt and terms of service
- Avoid scraping without permission
- Comply with GDPR/data protection laws
- Get consent for user data in testing

---

## Practical Examples

### Example 1: Performance Audit with Recommendations

**Goal:** Audit a page and get actionable optimization advice.

**Prompt:**
```
Please analyze the performance of https://example.com and provide optimization recommendations.
```

**AI Workflow:**

```javascript
// 1. Navigate
navigate_page("https://example.com")

// 2. Emulate slow mobile
emulate({
  networkConditions: "Slow 4G",
  cpuThrottlingRate: 4
})
resize_page({ width: 375, height: 667 })

// 3. Run performance trace
performance_start_trace({ reload: true, autoStop: true })

// Results show:
// - LCP: 4.2s (Poor)
// - CLS: 0.15 (Needs Improvement)
// - FCP: 2.1s (Good)

// 4. Analyze LCP
performance_analyze_insight({
  insightSetId: "...",
  insightName: "LCPBreakdown"
})
// Shows: Hero image (2.5MB) is LCP element

// 5. Analyze CLS
performance_analyze_insight({
  insightSetId: "...",
  insightName: "CumulativeLayoutShift"
})
// Shows: Logo loading without dimensions causing shift

// 6. Check network
list_network_requests({ resourceTypes: ["image"] })
// Finds: hero.jpg is 2.5MB, unoptimized

// 7. Take screenshot
take_screenshot()

// AI provides recommendations:
// - Optimize hero image (compress to < 200KB)
// - Add explicit width/height to logo
// - Use responsive images (srcset)
// - Consider lazy loading below-fold images
```

### Example 2: Automated Regression Test

**Goal:** Test login flow after code changes.

**Test Case:**
1. Navigate to login page
2. Enter credentials
3. Submit form
4. Verify dashboard loads
5. Check for JavaScript errors

**Prompt:**
```
Run the login regression test and report any issues.
```

**AI Workflow:**

```javascript
// 1. Navigate
navigate_page("https://app.example.com/login")
take_snapshot()

// 2. Fill credentials
fill_form({
  elements: [
    { uid: 1, value: "test@example.com" },
    { uid: 2, value: "TestPass123!" }
  ]
})

// 3. Screenshot before submit
take_screenshot({ filePath: "/tests/login-form.png" })

// 4. Submit
click(uid=3) // Login button

// 5. Wait for dashboard
wait_for("Dashboard")

// 6. Verify
take_snapshot()
// Confirms: "Welcome, Test User" present

// 7. Check console
list_console_messages({ types: ["error", "warn"] })
// Result: No errors

// 8. Check network
list_network_requests({ resourceTypes: ["xhr", "fetch"] })
// Result: All requests successful (status 200)

// 9. Final screenshot
take_screenshot({ filePath: "/tests/dashboard-success.png" })

// AI reports: ✅ Login test passed. No errors detected.
```

### Example 3: CORS Debugging

**Goal:** Diagnose why API calls are failing on localhost.

**Prompt:**
```
I'm getting CORS errors when fetching data from the API. Can you investigate?
```

**AI Workflow:**

```javascript
// 1. Navigate
navigate_page("http://localhost:3000")

// 2. Trigger the API call
click(uid=5) // "Load Data" button

// 3. Check network
list_network_requests({ resourceTypes: ["fetch"] })
// Shows: Request to https://api.example.com/data with status (failed)

// 4. Get request details
get_network_request(reqid=12)
// Returns:
// {
//   url: "https://api.example.com/data",
//   status: "failed",
//   error: "net::ERR_FAILED"
// }

// 5. Check console
list_console_messages({ types: ["error"] })
// Shows:
// "Access to fetch at 'https://api.example.com/data' from origin
//  'http://localhost:3000' has been blocked by CORS policy:
//  No 'Access-Control-Allow-Origin' header is present"

// 6. Take screenshot
take_screenshot()

// AI explains:
// The API server (api.example.com) is not sending the required
// Access-Control-Allow-Origin header. To fix:
//
// 1. Add CORS headers on the API server:
//    Access-Control-Allow-Origin: http://localhost:3000
//    Access-Control-Allow-Methods: GET, POST
//    Access-Control-Allow-Headers: Content-Type
//
// 2. Or use a proxy in development to avoid CORS:
//    Configure Next.js/Vite/CRA proxy to api.example.com
```

### Example 4: Mobile CLS Investigation

**Goal:** Find why layout shift is bad on mobile but fine on desktop.

**Prompt:**
```
Our CLS score is 0.25 on mobile but only 0.05 on desktop. Can you find the cause?
```

**AI Workflow:**

```javascript
// 1. Test desktop first (baseline)
resize_page({ width: 1920, height: 1080 })
navigate_page("https://example.com")
performance_start_trace({ reload: true, autoStop: true })
// CLS: 0.05 (Good)

// 2. Test mobile
resize_page({ width: 375, height: 667 })
navigate_page("https://example.com")
performance_start_trace({ reload: true, autoStop: true })
// CLS: 0.25 (Poor)

// 3. Analyze CLS
performance_analyze_insight({
  insightSetId: "...",
  insightName: "CumulativeLayoutShift"
})
// Shows:
// - Main shift at 1.2s
// - Element: .hero-image
// - Shift amount: 0.18

// 4. Inspect element
take_snapshot({ verbose: true })
// Shows: <img class="hero-image" src="hero.jpg" />
// Missing: width and height attributes

// 5. Check CSS
evaluate_script(`
  () => {
    const img = document.querySelector('.hero-image');
    const styles = window.getComputedStyle(img);
    return {
      width: styles.width,
      height: styles.height,
      aspectRatio: styles.aspectRatio
    };
  }
`)
// Returns: { width: "100%", height: "auto", aspectRatio: "auto" }

// 6. Take screenshots at different stages
// (Manual: screenshot at 0s, 0.5s, 1s, 1.5s)

// AI diagnosis:
// The hero image loads without dimensions, causing layout shift on mobile.
// On desktop, the larger viewport and faster loading reduces visible shift.
//
// Fix:
// 1. Add explicit dimensions to <img>:
//    <img width="750" height="500" src="hero.jpg" />
//
// 2. Or use aspect-ratio CSS:
//    .hero-image { aspect-ratio: 3/2; }
//
// 3. Use responsive images:
//    <img srcset="hero-mobile.jpg 750w, hero-desktop.jpg 1500w" />
```

### Example 5: Authenticated Task Automation

**Goal:** Check GitHub notifications and summarize pull requests.

**Setup:** Debug Chrome with GitHub logged in.

**Prompt:**
```
Check my GitHub notifications and tell me which pull requests need my review.
```

**AI Workflow:**

```javascript
// 1. Navigate to notifications (already logged in)
navigate_page("https://github.com/notifications")
take_snapshot()

// 2. Filter for pull requests
click(uid=8) // "Pull requests" filter

// 3. Take snapshot of results
take_snapshot()
// Shows:
// [12] link "feat: Add dark mode support - username/repo"
// [13] link "fix: Resolve CORS issue - username/repo"
// [14] link "chore: Update dependencies - username/repo"

// 4. For each PR, get details
navigate_page("https://github.com/username/repo/pull/123")
take_snapshot()
// Extract: title, description, changes, comments

// 5. Take screenshot
take_screenshot()

// AI summarizes:
// You have 3 pull requests needing review:
//
// 1. feat: Add dark mode support (username/repo#123)
//    - 12 files changed, +450 -120 lines
//    - Adds theme switcher and dark styles
//    - 2 comments from reviewers
//    - Priority: High (feature request)
//
// 2. fix: Resolve CORS issue (username/repo#124)
//    - 3 files changed, +25 -10 lines
//    - Fixes API authentication headers
//    - No comments yet
//    - Priority: Medium (bug fix)
//
// 3. chore: Update dependencies (username/repo#125)
//    - 1 file changed (package.json)
//    - Updates security patches
//    - Priority: Low (maintenance)
```

### Example 6: Form Validation Testing

**Goal:** Test edge cases in a signup form.

**Prompt:**
```
Test the signup form at /signup for validation issues.
```

**AI Workflow:**

```javascript
// Test 1: Empty form submission
navigate_page("https://app.example.com/signup")
take_snapshot()
click(uid=10) // Submit without filling
take_screenshot()
// Verify: validation messages appear

// Test 2: Invalid email
navigate_page("https://app.example.com/signup")
fill_form({
  elements: [
    { uid: 1, value: "John Doe" },
    { uid: 2, value: "invalid-email" }, // Bad format
    { uid: 3, value: "Pass123!" }
  ]
})
click(uid=10)
take_screenshot()
// Verify: email validation error

// Test 3: Weak password
navigate_page("https://app.example.com/signup")
fill_form({
  elements: [
    { uid: 1, value: "John Doe" },
    { uid: 2, value: "john@example.com" },
    { uid: 3, value: "123" } // Too short
  ]
})
click(uid=10)
take_screenshot()
// Verify: password strength error

// Test 4: Successful submission
navigate_page("https://app.example.com/signup")
fill_form({
  elements: [
    { uid: 1, value: "John Doe" },
    { uid: 2, value: "john@example.com" },
    { uid: 3, value: "SecurePass123!" }
  ]
})
click(uid=10)
wait_for("Account created")
take_screenshot()

// Check console for errors
list_console_messages({ types: ["error", "warn"] })

// AI reports:
// ✅ Empty form: Shows validation messages correctly
// ✅ Invalid email: Shows "Please enter a valid email"
// ✅ Weak password: Shows "Password must be at least 8 characters"
// ✅ Valid submission: Account created successfully
// ⚠️  Console warning: "Deprecated API used in analytics.js"
```

### Example 7: Cross-Browser Screenshot Comparison

**Goal:** Verify layout consistency (using Chrome as baseline).

**Prompt:**
```
Take screenshots of the homepage at different viewport sizes for design review.
```

**AI Workflow:**

```javascript
const viewports = [
  { name: "mobile-portrait", width: 375, height: 667 },
  { name: "mobile-landscape", width: 667, height: 375 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "4k", width: 3840, height: 2160 }
]

for (const vp of viewports) {
  resize_page({ width: vp.width, height: vp.height })
  navigate_page("https://example.com")
  take_screenshot({
    filePath: `/screenshots/homepage-${vp.name}.png`
  })
}

// AI generates: 6 screenshots for design review
// Designer can compare layouts across devices
```

---

## Additional Resources

### Official Documentation
- [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Chrome for Developers Blog: Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp)
- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)

### Tutorials & Guides
- [How to Set Up Chrome DevTools MCP with Claude Code (Authentication)](https://raf.dev/blog/chrome-debugging-profile-mcp/)
- [Chrome DevTools MCP: AI Browser Debugging Complete Guide 2025](https://vladimirsiedykh.com/blog/chrome-devtools-mcp-ai-browser-debugging-complete-guide-2025)
- [Using AI and Chrome MCP to Automate Core Web Vitals](https://dev.to/marianocodes/using-ai-and-chrome-devtools-to-automate-core-web-vitals-56j1)
- [Addy Osmani: Give Your AI Eyes](https://addyosmani.com/blog/devtools-mcp/)

### Community Resources
- [MCP Servers Directory: Chrome DevTools](https://mcpservers.org/servers/github-com-chromedevtools-chrome-devtools-mcp)
- [LobeHub MCP Servers: Chrome DevTools](https://lobehub.com/mcp/chromedevtools-chrome-devtools-mcp)

### Related Tools
- [Playwright MCP](https://github.com/executeautomation/playwright-mcp-server) - Cross-browser testing alternative
- [Puppeteer](https://pptr.dev/) - Underlying automation library
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP standard documentation

---

## Changelog

**Version 1.0** (December 27, 2025)
- Initial comprehensive guide created
- Based on Chrome DevTools MCP public preview (September 2025)
- Covers 26 tools across 6 categories
- Includes authentication setup, best practices, troubleshooting

**Future Updates:**
- Track new features as MCP evolves
- Add examples from community usage
- Update for Chrome 144+ auto-connect feature
- Include additional troubleshooting as issues are discovered

---

## Contributing

Found an issue or have a tip to add?

This guide is maintained in the `content-master-pro` project. Contributions welcome via pull requests or issues.

**Areas for expansion:**
- More practical examples (e.g., SEO analysis, accessibility testing)
- Integration with CI/CD pipelines
- Performance benchmarking workflows
- Advanced JavaScript injection patterns
- Multi-page testing workflows

---

## License

This guide is created for the SubStack "Limited Edition Jonathan" workspace.

Chrome DevTools MCP is an official Google/Chrome project. See the [official repository](https://github.com/ChromeDevTools/chrome-devtools-mcp) for licensing information.

---

**Last Updated:** December 27, 2025
**Author:** Research compiled by Claude (Anthropic) for Jonathan Edwards
**Project:** content-master-pro (SubStack workspace)
