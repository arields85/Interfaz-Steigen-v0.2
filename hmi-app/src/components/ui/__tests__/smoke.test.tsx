// Smoke test: valida que jsdom + RTL + jest-dom matchers funcionan.
import { render } from '@testing-library/react';
import LoadingSkeleton from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('se renderiza en el documento', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
