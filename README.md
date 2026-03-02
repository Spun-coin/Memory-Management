# 🎓 CollegeVault — Memory Management

> A smart, beautiful document management system for college students — organize your study materials by semester and subject.

![CollegeVault](https://img.shields.io/badge/CollegeVault-Memory%20Management-6c63ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRleHQgeT0iMjAiIGZvbnQtc2l6ZT0iMjAiPvCfjoM8L3RleHQ+PC9zdmc+)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## ✨ Features

- 📁 **8 Semester Directories** — Organized folders from Semester 1 to 8
- 🗂️ **Subject Folders for Semester 3** — Pre-built folders for:
  - ⚙️ Control System
  - 🖥️ Computer Graphics
  - 📐 Math III
  - 🔬 Microprocessor
  - 📝 English
  - ⚡ Advanced Electronics
- ➕ **Add Custom Subjects** — Add your own subjects to any semester with a custom emoji icon
- 📤 **File Upload** — Drag & drop or click to upload any file type (PDF, DOCX, images, etc.)
- 👁️ **File Preview** — Inline preview for images, PDFs, and text files
- ⬇️ **Download & Delete** — Full file management from the UI
- 🔍 **Search** — Instantly search across all semesters and subjects
- 🕐 **Recent Files** — View your latest uploads
- 💾 **Persistent Storage** — Files saved in browser `localStorage`
- 🌙 **Dark Theme** — Premium glassmorphism dark UI with animated gradients
- 📱 **Responsive** — Works on desktop and mobile

---

## 🚀 Getting Started

This is a **pure HTML/CSS/JavaScript** application — no build tools or dependencies required!

### Option 1: Open directly
Simply open `index.html` in any modern web browser:
```
index.html  ← double-click or open in browser
```

### Option 2: Serve locally
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then visit `http://localhost:8000`

---

## 📂 Project Structure

```
Memory Management/
├── index.html      # Main HTML structure & layout
├── style.css       # Dark theme styling & animations
├── app.js          # Application logic & localStorage
└── README.md       # You are here
```

---

## 🗂️ How to Use

### Navigating Semesters
1. Click any **Semester card** on the Dashboard
2. Browse subject folders or upload files directly

### Adding Custom Subjects
1. Open any semester (e.g. Semester 1, 2, 4…)
2. Click the **"+ Add Subject"** button
3. Enter a subject name and pick an emoji icon
4. Your subject is saved permanently in the browser

### Uploading Files
- Click **"+ Upload File"** in the top-right
- Or click the **"Drop files here"** zone in any semester/subject
- Or **drag & drop** files directly onto the drop zone

### Deleting Custom Subjects
- Hover over a **custom subject card** → click the **✕** button

---

## 💡 Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure |
| **CSS3** | Glassmorphism design, animations |
| **Vanilla JavaScript** | App logic, routing, state |
| **localStorage API** | File & subject persistence |
| **FileReader API** | In-browser file reading |
| **Google Fonts** | Inter + Space Grotesk typography |

---

## 🎨 Design Highlights

- **Dark glassmorphism** UI with floating gradient orbs
- **Smooth animations** — card entrances, hover effects, modal transitions
- **Color-coded semesters** — each semester has its own accent color
- **Emoji icon picker** — visually select icons for custom subjects
- **Responsive grid** — adapts from 4-column to 1-column on mobile

---

## 👤 Author

**Spun-coin**  
📧 cocff1011@gmail.com  
🔗 [GitHub Profile](https://github.com/Spun-coin)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  Made with ❤️ for college students who love organized notes
</div>
