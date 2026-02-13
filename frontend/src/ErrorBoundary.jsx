import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // You could also log to an external service here
    // console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.state.error?.message || String(this.state.error);
    const stack = this.state.info?.componentStack || this.state.error?.stack || '';

    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, Arial', color: '#111' }}>
        <h2 style={{ color: '#b91c1c' }}>An error occurred while rendering the app</h2>
        <p style={{ marginTop: 8 }}>{message}</p>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, background: '#f8f8f8', padding: 12, borderRadius: 6 }}>{stack}</pre>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 12px', borderRadius: 6 }}>Reload</button>
        </div>
      </div>
    );
  }
}
