import {Code2, FileText, Home, Image, Menu, X} from 'lucide-react';
import {useState} from 'react';
import {Link, NavLink, Outlet} from 'react-router-dom';

const links = [
  {to: '/', label: 'Home', icon: Home},
  {to: '/#features', label: 'Features', icon: Home},
  {to: '/#architecture', label: 'Execution', icon: Home},
  {to: '/docs', label: 'Documentation', icon: FileText},
  {to: '/screenshots', label: 'Screenshots', icon: Image},
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#16161a] text-slate-300 selection:bg-purple-500/30">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#16161a]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <img
              src="/1.jpg"
              alt="Velo Code logo"
              className="h-10 w-auto rounded-lg border border-white/10 bg-[#232329] object-contain shadow-lg"
            />
            <h1 className='hover:text-cyan-300'>Velo Code </h1>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => {
              const baseClasses = 'rounded-full px-4 py-2 text-sm font-medium transition-colors';
              if (link.to.includes('#')) {
                return (
                  <Link key={link.to} to={link.to} className={`${baseClasses} text-slate-300 hover:text-cyan-300`}>
                    {link.label}
                  </Link>
                );
              }
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({isActive}) =>
                    `${baseClasses} ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-cyan-300'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              );
            })}
            <a
              href="/#hero"
              className="ml-2 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:from-purple-500 hover:to-cyan-400"
            >
              Open Website Copy
            </a>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/5 bg-[#1a1a1e] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isHashLink = link.to.includes('#');
                const classes =
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300';
                if (isHashLink) {
                  return (
                    <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={classes}>
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                }
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={({isActive}) =>
                      `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        isActive ? 'bg-white/10 text-white' : 'text-slate-300'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-white/5 bg-[#111114] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2">
            <Code2 className="h-4 w-4 text-cyan-400" />
            <span>Velo Code documentation website</span>
          </div>
          <p>Copyright {new Date().getFullYear()} Velo Code</p>
        </div>
      </footer>
    </div>
  );
}
