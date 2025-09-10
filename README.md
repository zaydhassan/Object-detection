# Video Interview Proctoring System

A web application to monitor candidate focus and detect unauthorized items (phone, book, notes, devices) in real-time during online video interviews. Built with React, Next.js, TensorFlow.js, and MediaPipe/COCO-SSD object detection models.

---

## Features

- Live webcam video capture and recording
- Real-time face/focus detection with alerts
- Multi-face detection and alerting
- Suspicious item detection (mobile phones, books, laptops)
- Event logging with timestamps
- Video recording download
- Ready for backend integration for logs/reporting

---

## Installation

### Prerequisites

- Node.js (v16 or later recommended)
- npm (comes with Node.js)
- Modern web browser with webcam support (Chrome, Edge preferred)

### Setup

1. Clone the repository:

git clone "repo-url"


2. Install dependencies:

npm install


---

## Usage

### Development Server

Run the app locally with hot reload for development:

npm run dev

---

## How It Works

- The app accesses your webcam on page load (permission required).
- Uses TensorFlow.js BlazeFace to detect faces and check focus.
- Uses TensorFlow.js COCO-SSD to detect phones/books/laptops.
- Suspicious events generate alerts and are logged live.
- The candidate video can be recorded and downloaded locally.
- Logs can be extended to send to backend APIs.

---

## Troubleshooting

- **Camera not detected:**  
  Ensure your webcam works in other apps and browser permissions are granted.

- **No detections/events:**  
  Confirm TensorFlow.js models load (check browser console).  
  Test with proper lighting and clear camera view.

- **Recording issues:**  
  Confirm browser supports MediaRecorder API.

---
