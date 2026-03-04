import {useEffect} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {Layout} from './components/Layout';
import {DocArticlePage} from './pages/DocArticlePage';
import {DocsHubPage} from './pages/DocsHubPage';
import {HomePage} from './pages/HomePage';
import {ScreenshotsPage} from './pages/ScreenshotsPage';

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      requestAnimationFrame(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
      });
      return;
    }

    window.scrollTo({top: 0, behavior: 'smooth'});
  }, [location.pathname, location.hash]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsHubPage />} />
          <Route path="/docs/:slug" element={<DocArticlePage />} />
          <Route path="/screenshots" element={<ScreenshotsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
