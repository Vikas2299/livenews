# LiveNews - American Political News App

An Inshorts-style React Native app that displays political news from different viewpoints (General, Republican, Liberal, Conservative) with a beautiful, mobile-optimized interface.

## 🎯 Features

- **4 Political Viewpoint Tabs**: G (General), R (Republican), L (Liberal), C (Conservative)
- **Inshorts-Style UI**: Large hero images with news content below
- **Chrome-Style Tabs**: Small, subtle tabs positioned between image and content
- **Sources Functionality**: View which news sources contributed to each story
- **Comments Section**: Engage in discussions about each story
- **Color-coded Tabs**: 
  - G (General) - Gray
  - R (Republican) - Red
  - L (Liberal) - Blue
  - C (Conservative) - White with black border
- **Mobile Optimized**: Perfect fit on Android and iOS screens
- **Responsive Design**: Works seamlessly on web and mobile

## 🎨 Design Features

- **Full-Width Hero Images**: Large, impactful images that dominate the top of the screen
- **Clean Typography**: Professional fonts with optimized spacing for mobile
- **Interactive Elements**: Smooth tab switching with visual feedback
- **Card-Based Layout**: Sources and comments in clean, organized cards
- **Subtle Animations**: Shadow effects and smooth interactions
- **One-Page Layout**: Everything fits perfectly on a single screen

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (will be installed with dependencies)

### Installation

1. **Clone and navigate to the project**:
```bash
cd LiveNews-FE
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm start
```

4. **Run on your preferred platform**:
   - Press `w` for web
   - Press `a` for Android (requires Android Studio)
   - Press `i` for iOS (requires Xcode on Mac)
   - Scan QR code with Expo Go app on your phone

## 📱 Running on Mobile

### Option 1: Expo Go App (Easiest)
1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `npm start` in your terminal
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

### Option 2: Android Studio Emulator
1. Install Android Studio
2. Set up an Android Virtual Device (AVD)
3. Run `npm run android`

### Option 3: iOS Simulator (Mac only)
1. Install Xcode
2. Run `npm run ios`

## 🌐 Running on Web

```bash
npm run web
```

Then open http://localhost:19006 in your browser.

## 📂 Project Structure

```
LiveNews-FE/
├── App.tsx                 # Main app with tab navigation and news display
├── index.js               # Entry point with proper app registration
├── package.json           # Dependencies and scripts
├── app.json              # Expo configuration
├── babel.config.js       # Babel configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## 🎨 UI Components

### Main Layout
- **Hero Image**: Large, full-width image at the top (50% of screen height)
- **Chrome-Style Tabs**: Small, subtle tabs (G, R, L, C) between image and content
- **News Title**: Bold, prominent headline
- **Short Section**: News content with decorative "short" label
- **Action Buttons**: Sources and Comments buttons
- **Expandable Sections**: Sources and Comments that expand when clicked

### Tab System
- **General (G)**: Gray tab for balanced news coverage
- **Republican (R)**: Red tab for conservative perspective
- **Liberal (L)**: Blue tab for progressive perspective
- **Conservative (C)**: White tab with black border for traditional conservative view

## 🔧 Technical Details

### Dependencies
- **React Native**: 0.72.5
- **Expo**: ~49.0.0
- **React Navigation**: Bottom tabs navigation
- **React Native Web**: Web support
- **TypeScript**: Type safety

### Key Features
- **Responsive Design**: Optimized for mobile screens
- **Cross-Platform**: Works on iOS, Android, and Web
- **Modern UI**: Clean, professional design inspired by Inshorts
- **Interactive Elements**: Smooth tab switching and expandable sections
- **Mobile-First**: Designed specifically for mobile news consumption

## 🎯 Current Status

✅ **Completed Features:**
- Beautiful Inshorts-style UI with large hero images
- 4 political viewpoint tabs with proper color coding
- Chrome-style tab navigation
- Sources functionality with expandable sections
- Comments system with user interactions
- Mobile-optimized layout that fits on one screen
- Cross-platform compatibility (iOS, Android, Web)
- Responsive design for all screen sizes

## 🚀 Future Enhancements

- [ ] Swipe gestures for news navigation
- [ ] Real news API integration
- [ ] User authentication system
- [ ] Push notifications for breaking news
- [ ] Story sharing functionality
- [ ] Search and filtering
- [ ] Offline reading capability
- [ ] Dark mode support
- [ ] Accessibility improvements

## 🛠️ Built With

- **React Native** - Mobile framework
- **Expo** - Development platform and tools
- **TypeScript** - Type safety and better development experience
- **React Navigation** - Navigation library
- **React Native Web** - Web compatibility

## 📱 Screenshots

The app features:
- Large, impactful hero images
- Clean, readable typography
- Intuitive tab navigation
- Expandable sources and comments
- Mobile-optimized single-page layout

## 🔧 Troubleshooting

### Common Issues

1. **Metro Config Errors**: If you get metro config errors, delete `node_modules` and reinstall:
```bash
Remove-Item -Recurse -Force node_modules
npm install
```

2. **Android "main not registered" Error**: This has been fixed with proper app registration in `index.js`

3. **Web Build Errors**: If web doesn't work, try:
```bash
npx expo install @expo/webpack-config
```

4. **Clear Cache**: If you encounter persistent errors:
```bash
npx expo start -c
```

## 📄 License

This project is for educational and demonstration purposes.

## 🤝 Contributing

This is a demonstration project showcasing modern React Native development with Expo, TypeScript, and responsive design principles.

---

**LiveNews** - Stay informed with balanced political perspectives 📰