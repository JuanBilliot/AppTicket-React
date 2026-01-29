import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';

// Tema personalizado
import theme from './theme';

// Componentes
import Sidebar from './components/Sidebar';
import ServerStatus from './pages/ServerStatus';
import TicketList from './pages/TicketList';
import NewTicket from './pages/NewTicket';
import EditTicket from './pages/EditTicket';
import Kanban from './pages/Kanban';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="app-container">
          <Sidebar />
          <Container className="main-container" maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 4 } }}>
            <Routes>
              <Route path="/" element={<ServerStatus />} />
              <Route path="/tickets" element={<TicketList />} />
              <Route path="/new-ticket" element={<NewTicket />} />
              <Route path="/edit-ticket/:id" element={<EditTicket />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
