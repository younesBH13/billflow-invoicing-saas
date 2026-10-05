# BillFlow Frontend

React-based frontend application for the BillFlow facturation and client management system.

## Features

- Modern React application with TypeScript
- Responsive design with Tailwind CSS
- Real-time data updates from backend API
- Comprehensive client and invoice management
- Advanced reporting and analytics
- Document template customization
- Multi-user support with role-based access
- Offline-capable design for desktop deployment

## Technology Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Recharts** - Responsive chart library for data visualization

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── ui/             # Base UI components
│   ├── forms/          # Form components
│   ├── charts/         # Chart components
│   └── layout/         # Layout components
├── contexts/           # React context providers
│   └── AppContext.tsx  # Main application state
├── services/           # API service layer
│   └── api.ts          # Backend API integration
├── pages/              # Application pages/views
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── styles/             # Global styles and Tailwind config
```

## Key Components

### AppContext
Central state management for the entire application, handling:
- User authentication state
- Client data management
- Invoice and payment tracking
- Document template management
- API integration and error handling

### API Service
Comprehensive service layer for backend communication:
- RESTful API calls with error handling
- Authentication token management
- Request/response transformation
- Offline capability considerations

### UI Components
Reusable components built with Tailwind CSS:
- Form inputs with validation
- Data tables with sorting and filtering
- Modal dialogs for data entry
- Charts and visualizations
- Navigation and layout components

## Pages and Features

### Dashboard
- Revenue overview and key metrics
- Recent activity summary
- Quick access to common actions
- Visual charts for business insights

### Client Management
- Complete CRUD operations for clients
- Advanced filtering and search
- Client classification and revenue tracking
- Export capabilities for client data

### Invoice Management
- Create proforma, definitive, and credit note invoices
- Automatic invoice numbering
- Line item management with calculations
- Invoice status tracking and updates
- Convert between invoice types

### Payment Tracking
- Record payments against invoices
- Multiple payment method support
- Payment history and reconciliation
- Automatic invoice status updates

### Delivery Notes
- Create and manage delivery notes
- Link delivery notes to clients
- Track delivery status and observations

### Reporting and Analytics
- Advanced revenue reporting
- Client performance analytics
- Monthly and yearly comparisons
- Exportable reports and charts

### Document Templates
- Customizable invoice and document templates
- Template preview and editing
- Default template management
- Styling and layout options

## Installation and Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   # Create .env file
   echo "VITE_API_URL=http://localhost:3001/api" > .env
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open http://localhost:8080 in your browser

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

Create a `.env` file in the frontend directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001/api

# Optional: Enable development features
VITE_DEV_MODE=true
```

## Authentication

The application uses JWT token-based authentication:

- Login with username and password
- Tokens stored in localStorage
- Automatic token refresh handling
- Role-based access control (admin/commercial)
- Secure logout with token cleanup

### Default Users

- **Admin**: `admin` / `admin123`
  - Full access to all features
  - User management capabilities
  - System configuration access

- **Commercial**: `commercial` / `commercial123`
  - Client and invoice management
  - Payment recording
  - Basic reporting access

## State Management

The application uses React Context for state management:

### AppContext Features
- Centralized state for all business data
- Optimistic updates for better UX
- Error handling and user feedback
- Loading states for async operations
- Data synchronization with backend

### Data Flow
1. User actions trigger context methods
2. Context methods call API services
3. API responses update local state
4. Components re-render with new data
5. Error states handled gracefully

## Styling and Theming

### Tailwind CSS Configuration
- Custom color palette for brand consistency
- Responsive design utilities
- Component-specific styling
- Dark mode support (configurable)

### Design System
- Consistent spacing and typography
- Reusable component patterns
- Accessible color contrasts
- Mobile-first responsive design

## Performance Optimization

- Code splitting with React.lazy()
- Memoization of expensive calculations
- Efficient re-rendering with React.memo
- Optimized bundle size with Vite
- Image optimization and lazy loading

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Deployment

### Production Build
```bash
npm run build
```

### Static Hosting
The built application can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Desktop Application
For desktop deployment, the application can be packaged with:
- Electron for cross-platform desktop apps
- Tauri for lightweight native applications
- PWA for web-based desktop experience

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Implement proper error boundaries
- Write descriptive component and function names
- Use consistent file and folder naming

### Component Development
- Create reusable components in the `components/ui` directory
- Use TypeScript interfaces for component props
- Implement proper prop validation
- Include JSDoc comments for complex components

### State Management
- Use AppContext for global state
- Local state for component-specific data
- Custom hooks for reusable stateful logic
- Avoid prop drilling with context providers

## Testing

### Testing Strategy
- Unit tests for utility functions
- Component tests with React Testing Library
- Integration tests for user workflows
- E2E tests for critical user paths

### Running Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Troubleshooting

### Common Issues

**API Connection Errors**
- Verify backend server is running on port 3001
- Check CORS configuration in backend
- Ensure environment variables are set correctly

**Authentication Issues**
- Clear localStorage and try logging in again
- Verify JWT token format and expiration
- Check backend authentication endpoints

**Build Errors**
- Clear node_modules and reinstall dependencies
- Check TypeScript configuration
- Verify all imports and exports are correct

### Development Tools

- React Developer Tools browser extension
- Redux DevTools for state inspection
- Vite development server with HMR
- TypeScript language server for IDE support

