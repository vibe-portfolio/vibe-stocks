'use client';

import React, { type ComponentType } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
// Use plotly.js-dist-min (lightweight) instead of plotly.js so the build resolves
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Plotly = require('plotly.js-dist-min');

type PlotProps = {
  data: any[];
  layout?: any;
  config?: any;
  frames?: any[];
  style?: React.CSSProperties;
  className?: string;
  useResizeHandler?: boolean;
  onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
  onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
  onPurge?: (figure: any, graphDiv: HTMLElement) => void;
  onError?: (err: any) => void;
};

const Plot = createPlotlyComponent(Plotly as any) as ComponentType<PlotProps>;
export default Plot;
