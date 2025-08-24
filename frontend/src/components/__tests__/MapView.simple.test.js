import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MapView from '../MapView';
import '@testing-library/jest-dom';

// Mock all complex dependencies
jest.mock('react-leaflet', () => {
  const MockLayersControl = ({ children }) => <div data-testid="layers-control">{children}</div>;
  MockLayersControl.Overlay = ({ children }) => <div data-testid="layers-control-overlay">{children}</div>;
  
  return {
    MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: () => <div data-testid="marker" />,
    Popup: () => <div data-testid="popup" />,
    LayersControl: MockLayersControl
  };
});

jest.mock('../FaultLayer', () => {
  return function MockFaultLayer() {
    return <div data-testid="fault-layer" />;
  };
});

// Mock leaflet
jest.mock('leaflet', () => ({
  divIcon: jest.fn(() => ({})),
}));

// Mock config and utils
jest.mock('../../config', () => ({
  MAP_CONFIG: {
    DEFAULT_CENTER: [19.0760, 72.8777],
    DEFAULT_ZOOM: 10,
    MIN_ZOOM: 8,
    MAX_ZOOM: 18
  }
}));

jest.mock('../../utils/helpers', () => ({
  getFaultLevelBadgeClasses: jest.fn(() => 'badge-low'),
  getFaultLevelColor: jest.fn(() => '#00ff00'),
  formatDate: jest.fn(() => '2024-01-01'),
  formatTemperature: jest.fn(() => '25.5°C')
}));

const mockReports = [
  {
    id: 1,
    tower_name: 'Tower A',
    latitude: 19.0760,
    longitude: 72.8777,
    image_temp: 45.2,
    fault_level: 'CRITICAL',
    timestamp: '2024-01-15T10:30:00Z'
  }
];

const renderMapView = (props = {}) => {
  return render(
    <BrowserRouter>
      <MapView reports={mockReports} {...props} />
    </BrowserRouter>
  );
};

describe('MapView Component (Basic)', () => {
  it('should render without crashing', () => {
    renderMapView();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should render tile layer', () => {
    renderMapView();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('should render legend', () => {
    renderMapView();
    expect(screen.getByText('Map Legend')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('should handle empty reports array', () => {
    render(
      <BrowserRouter>
        <MapView reports={[]} />
      </BrowserRouter>
    );
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
