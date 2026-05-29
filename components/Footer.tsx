import SocialIcons from './SocialIcons';
import { PAID_FOR } from '@/lib/constants';

export default function Footer() {
  return (
    <footer>
      <div className="footer-social">
        <SocialIcons />
      </div>
      <div className="footer-links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:contact@roycooper.com">Contact</a>
      </div>
      <p>{PAID_FOR}</p>
    </footer>
  );
}
