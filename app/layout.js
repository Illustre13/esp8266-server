// app/layout.js
export const metadata = {
  title: 'Helmet Control Room',
  description: 'Smart Safety Helmet Monitoring Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0A0E17', color: '#E2E8F0' }}>
        {children}
      </body>
    </html>
  );
}
