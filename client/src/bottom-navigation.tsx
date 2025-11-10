import { useLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { 
      path: "/", 
      icon: "fas fa-home", 
      label: "Home",
      isActive: location === "/"
    },
    { 
      path: "/learning", 
      icon: "fas fa-graduation-cap", 
      label: "Learn",
      isActive: location === "/learning" || location.startsWith("/module")
    },
    { 
      path: "/community", 
      icon: "fas fa-users", 
      label: "Community",
      isActive: location === "/community"
    },
    { 
      path: "/premium", 
      icon: "fas fa-crown", 
      label: "Premium",
      isActive: location === "/premium"
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 shadow-2xl overflow-hidden"
      style={{
        width: '100%',
        maxWidth: '100vw',
        background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
        opacity: 1,
        zIndex: 99999,
        boxSizing: 'border-box',
        margin: 0,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      <div 
        className="flex items-center py-3 overflow-hidden"
        style={{
          justifyContent: 'space-between',
          padding: '12px 16px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {navItems.map((item, index) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className="flex flex-col items-center justify-center rounded-xl transition-all duration-300 relative"
            style={{
              color: 'white',
              opacity: 1,
              transform: item.isActive ? 'scale(1.05)' : 'scale(1)',
              flex: 1,
              maxWidth: 'calc(25% - 8px)',
              padding: '8px 4px',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            {item.isActive && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-5 h-1 bg-white rounded-full"></div>
            )}
            <i 
              className={`${item.icon} transition-transform`}
              style={{
                color: 'white',
                fontSize: '18px',
                marginBottom: '2px',
                transform: item.isActive ? 'scale(1.1)' : 'scale(1)',
                opacity: 1
              }}
            ></i>
            <span 
              className="whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                color: 'white',
                fontWeight: '600',
                fontSize: '11px',
                opacity: 1,
                lineHeight: '1.2',
                maxWidth: '100%'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
