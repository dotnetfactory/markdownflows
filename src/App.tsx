import { DiagramsPage } from './pages/DiagramsPage';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <DiagramsPage />
      <Toaster />
    </div>
  );
}

export default App;
