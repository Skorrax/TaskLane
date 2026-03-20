# TaskLane

A lightweight Chrome extension for managing personal tasks in a Kanban-style board, displayed in the browser's side panel.

## Features

- **Side Panel UI** — opens as a side panel, stays visible while you browse
- **Collapsible sections** — organize tasks into custom columns (e.g. To Do, In Progress, Done)
- **Drag & Drop** — move tasks between sections by dragging
- **Due dates with time** — set date and time for task deadlines
- **Overdue highlighting** — tasks past their due date are visually marked
- **Badge notifications** — extension icon shows a count of overdue tasks
<img width="64" height="58" alt="image" src="https://github.com/user-attachments/assets/8c2f3815-7a36-4013-b507-bb426d099272" />

- **Hide completed tasks** — finished tasks are hidden by default, togglable via a checkbox
- **Persistent storage** — all data is stored locally in the browser via `chrome.storage`
- **Multi-language** — supports German and English, automatically detected from Chrome's language setting
- **Dark theme** — clean, GitHub-inspired dark UI

<img width="400" height="548" alt="image" src="https://github.com/user-attachments/assets/f3ed7a4e-33eb-445e-aa5d-5bdaf7f9954e" />


## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the `TaskLane` folder
5. Click the TaskLane icon in the toolbar to open the side panel

## Usage

- **Add a section** — click "+ New Column" / "+ Neue Spalte" at the bottom
- **Add a task** — click "+ Add task" / "+ Aufgabe hinzufügen" within a section
- **Edit a task** — hover over a task and click the edit icon
- **Complete a task** — hover and click the checkmark icon
- **Delete a task/section** — hover and click the X icon (with confirmation)
- **Collapse a section** — click the section header
- **Move a task** — drag it to a different section, or change the section in the edit dialog
- **Show/hide completed tasks** — use the "Show completed" / "Erledigte anzeigen" checkbox in the header

## Third-Party Libraries

This project uses the following third-party library:

- **[flatpickr](https://flatpickr.js.org/)** v4.6.13 — date and time picker
  - License: MIT
  - Copyright (c) Gregory Petrosyan

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Credits

Built with the help of [Claude Code](https://claude.ai/claude-code).
