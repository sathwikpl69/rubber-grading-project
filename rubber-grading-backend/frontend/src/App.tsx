import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
// Login and Signup imports are removed

function App() {
  // No more authentication state needed here

  return (
    <Router>
      <Routes>
        {/* Only the Home route remains */}
        <Route
          path="/"
          element={
            <Home />
            // No more props needed for Home related to auth
          }
        />
        {/* Login and Signup routes are removed */}
        {/* You can optionally add a catch-all route here if needed */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </Router>
  );
}

export default App;

