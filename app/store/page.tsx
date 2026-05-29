import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store — Roy Cooper for North Carolina',
};

const PLACEHOLDER_ITEMS = [
  { id: 'p1', title: 'Campaign T-Shirt', price: '$25' },
  { id: 'p2', title: 'Yard Sign', price: '$10' },
  { id: 'p3', title: 'Bumper Sticker 3-Pack', price: '$5' },
  { id: 'p4', title: 'Campaign Hat', price: '$30' },
];

export default function Store() {
  return (
    <>
      <div className="page-hero">
        <h1>Store</h1>
        <p>Show your support with official campaign merchandise.</p>
      </div>

      <div className="page-content">
        <div className="store-grid">
          {PLACEHOLDER_ITEMS.map((item) => (
            <div className="product-card" key={item.id}>
              <div className="product-img" aria-hidden="true">
                Photo
              </div>
              <h3>{item.title}</h3>
              <div className="price">{item.price}</div>
              <a
                href="https://secure.actblue.com/donate/roy-cooper"
                target="_blank"
                rel="noopener noreferrer"
                className="product-buy"
                style={{ display: 'block', textAlign: 'center' }}
              >
                Buy
              </a>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
