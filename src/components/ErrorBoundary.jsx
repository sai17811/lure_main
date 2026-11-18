import {Component} from 'react';

export class ErrorBoundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(error) { console.warn('Section unavailable:',error); this.props.onError?.(error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
