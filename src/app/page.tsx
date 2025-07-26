// This is a temporary file to redirect to the default locale.
// In a real app, you would probably want to have a landing page here.
import {redirect} from 'next/navigation';

export default function RootPage() {
  redirect('/en');
}
