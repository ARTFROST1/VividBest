import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../app/_layout';

describe('App', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<App />);
    // Проверка, что главный контейнер есть
    expect(getByTestId('main-container')).toBeTruthy();
  });
});
