import { SearchX } from 'lucide-react';
import { EmptyState } from '../../components/ui/Feedback.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePageMeta } from '../../lib/seo.js';

export default function NotFound() {
  usePageMeta({ title: 'Page not found', description: 'This page does not exist.', noindex: true });
  return <div className="container-x py-16"><EmptyState icon={SearchX} title="Page not found" action={<Button to="/">Go home</Button>}>The page you are looking for does not exist or has moved.</EmptyState></div>;
}
