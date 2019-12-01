import React from 'react';
import PropTypes from 'prop-types';
import Pane from './Pane';

function clearSelection() {
  if (document.body.createTextRange) {
    // https://github.com/zesik/react-splitter-layout/issues/16
    // https://stackoverflow.com/questions/22914075/#37580789
    const range = document.body.createTextRange();
    range.collapse();
    range.select();
  } else if (window.getSelection) {
    if (window.getSelection().empty) {
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {
    document.selection.empty();
  }
}

const DEFAULT_SPLITTER_SIZE = 4;

class SplitterLayout extends React.Component {
  constructor(props) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleSplitterMouseDown = this.handleSplitterMouseDown.bind(this);
    //this.handleCollapseLeft = this.handleCollapseLeft.bind(this);
    this.handleCollapse = this.handleCollapse.bind(this);
    let splitterCollapseDirectionClass = 'splitter-collapser-right';
    let collapseArrowClass = 'triangle-right';

    if(props.splitterCollapseDirection === 'left'){
      splitterCollapseDirectionClass = 'splitter-collapser-left';
      collapseArrowClass = 'triangle-left';
    } else if(props.splitterCollapseDirection === 'right'){
      splitterCollapseDirectionClass = 'splitter-collapser-right';
      collapseArrowClass = 'triangle-right';
    }else if(props.splitterCollapseDirection === 'up'){
      splitterCollapseDirectionClass = 'splitter-collapser-up';
      collapseArrowClass = 'triangle-up';
    }else if(props.splitterCollapseDirection === 'down'){
      splitterCollapseDirectionClass = 'splitter-collapser-down';
      collapseArrowClass = 'triangle-down';
    }


    this.state = {
      secondaryPaneSize: 0,
      resizing: false,
      splitterCollapsed: false,
      secondaryPaneSizeBeforeCollapse: 0,
      splitterCollapseDirection: props.splitterCollapseDirection,
      splitterCollapseDirectionClass: splitterCollapseDirectionClass,
      collapseArrowClass: collapseArrowClass
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('touchend', this.handleMouseUp);
    document.addEventListener('touchmove', this.handleTouchMove);

    let secondaryPaneSize;
    if (typeof this.props.secondaryInitialSize !== 'undefined') {
      secondaryPaneSize = this.props.secondaryInitialSize;
    } else {
      const containerRect = this.container.getBoundingClientRect();
      let splitterRect;
      if (this.splitter) {
        splitterRect = this.splitter.getBoundingClientRect();
      } else {
        // Simulate a splitter
        splitterRect = { width: DEFAULT_SPLITTER_SIZE, height: DEFAULT_SPLITTER_SIZE };
      }
      secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: containerRect.left + ((containerRect.width - splitterRect.width) / 2),
        top: containerRect.top + ((containerRect.height - splitterRect.height) / 2)
      }, false);
    }
    this.setState({ secondaryPaneSize });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.secondaryPaneSize !== this.state.secondaryPaneSize && this.props.onSecondaryPaneSizeChange) {
      this.props.onSecondaryPaneSizeChange(this.state.secondaryPaneSize);
    }
    if (prevState.resizing !== this.state.resizing) {
      if (this.state.resizing) {
        if (this.props.onDragStart) {
          this.props.onDragStart();
        }
      } else if (this.props.onDragEnd) {
        this.props.onDragEnd();
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchend', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
  }

  getSecondaryPaneSize(containerRect, splitterRect, clientPosition, offsetMouse) {
    let totalSize;
    let splitterSize;
    let offset;
    if (this.props.vertical) {
      totalSize = containerRect.height;
      splitterSize = splitterRect.height;
      offset = clientPosition.top - containerRect.top;
    } else {
      totalSize = containerRect.width;
      splitterSize = splitterRect.width;
      offset = clientPosition.left - containerRect.left;
    }
    if (offsetMouse) {
      offset -= splitterSize / 2;
    }
    if (offset < 0) {
      offset = 0;
    } else if (offset > totalSize - splitterSize) {
      offset = totalSize - splitterSize;
    }

    let secondaryPaneSize;
    if (this.props.primaryIndex === 1) {
      secondaryPaneSize = offset;
    } else {
      secondaryPaneSize = totalSize - splitterSize - offset;
    }
    let primaryPaneSize = totalSize - splitterSize - secondaryPaneSize;
    if (this.props.percentage) {
      secondaryPaneSize = (secondaryPaneSize * 100) / totalSize;
      primaryPaneSize = (primaryPaneSize * 100) / totalSize;
      splitterSize = (splitterSize * 100) / totalSize;
      totalSize = 100;
    }

    if (primaryPaneSize < this.props.primaryMinSize) {
      secondaryPaneSize = Math.max(secondaryPaneSize - (this.props.primaryMinSize - primaryPaneSize), 0);
    } else if (secondaryPaneSize < this.props.secondaryMinSize) {
      secondaryPaneSize = Math.min(totalSize - splitterSize - this.props.primaryMinSize, this.props.secondaryMinSize);
    }

    return secondaryPaneSize;
  }

  handleResize() {
    if (this.splitter && !this.props.percentage) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: splitterRect.left,
        top: splitterRect.top
      }, false);
      this.setState({ secondaryPaneSize });
    }
  }

  handleMouseMove(e) {
    if (this.state.resizing) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: e.clientX,
        top: e.clientY
      }, true);
      clearSelection();

      if(secondaryPaneSize > 0){
        const collapseArrowClass = this.getArrowDirection(false);
        this.setState({ secondaryPaneSize, collapseArrowClass});
      }else{
        const collapseArrowClass = this.getArrowDirection(true);
        this.setState({ secondaryPaneSize,collapseArrowClass});
      }
    }
  }

  handleTouchMove(e) {
    this.handleMouseMove(e.changedTouches[0]);
  }

  handleSplitterMouseDown() {
    clearSelection();
    this.setState({ resizing: true });
  }

  handleMouseUp() {
    this.setState(prevState => (prevState.resizing ? { resizing: false } : null));
  }

  // handleCollapseLeft() {
  //   const collapsedLeft = true;
  //   const collapsedRight = false;
  //   const secondaryPaneSize = 50;
  //   this.setState({ collapsedLeft, collapsedRight, secondaryPaneSize });
  // }
  getArrowDirection(splitterCollapsed){
    let collapseArrowClass = '';
    
    switch(this.props.splitterCollapseDirection){
      case 'right':
          collapseArrowClass = splitterCollapsed ? 'triangle-left' : 'triangle-right';
        break;
      case 'left':
          collapseArrowClass = splitterCollapsed ? 'triangle-right' : 'triangle-left';
        break;
      case 'up':
          collapseArrowClass = splitterCollapsed ? 'triangle-down' : 'triangle-up';
        break;
      case 'down':
          collapseArrowClass = splitterCollapsed ? 'triangle-up' : 'triangle-down';
        break;
    }
    return collapseArrowClass;
  }

  handleCollapse() {
    // const collapsedLeft = false;
    // const collapsedRight = true;
    
    if(this.state.secondaryPaneSize === 0){
      const secondaryPaneSize = this.state.secondaryPaneSizeBeforeCollapse;
      const secondaryPaneSizeBeforeCollapse = 0;
      const splitterCollapsed = false;
      const collapseArrowClass = this.getArrowDirection(splitterCollapsed);
      this.setState({secondaryPaneSize,secondaryPaneSizeBeforeCollapse,collapseArrowClass,splitterCollapsed})
    }else{
      const secondaryPaneSize = 0;
      const splitterCollapsed = true;
      const collapseArrowClass = this.getArrowDirection(splitterCollapsed);
      const secondaryPaneSizeBeforeCollapse = this.state.secondaryPaneSize;
      this.setState({secondaryPaneSize,secondaryPaneSizeBeforeCollapse,collapseArrowClass,splitterCollapsed})
    }
    
  }

  alertUser() {
    console.log('test');
  }

  render() {
    let containerClasses = 'splitter-layout';

    if (this.props.customClassName) {
      containerClasses += ` ${this.props.customClassName}`;
    }
    if (this.props.vertical) {
      containerClasses += ' splitter-layout-vertical';
    }
    if (this.state.resizing) {
      containerClasses += ' layout-changing';
    }

    const children = React.Children.toArray(this.props.children).slice(0, 2);
    if (children.length === 0) {
      children.push(<div />);
    }
    const wrappedChildren = [];
    const primaryIndex = (this.props.primaryIndex !== 0 && this.props.primaryIndex !== 1) ? 0 : this.props.primaryIndex;
    for (let i = 0; i < children.length; ++i) {
      let primary = true;
      let size = null;
      if (children.length > 1 && i !== primaryIndex) {
        primary = false;
        size = this.state.secondaryPaneSize;
      }
      wrappedChildren.push(
        <Pane vertical={this.props.vertical} percentage={this.props.percentage} primary={primary} size={size}>
          {children[i]}
        </Pane>
      );
    }

    

    return (
      <div className={containerClasses} ref={(c) => { this.container = c; }}>
        {wrappedChildren[0]}
        {wrappedChildren.length > 1 &&
          (
            <div
              role="separator"
              className="layout-splitter"
              ref={(c) => { this.splitter = c; }}
              onMouseDown={this.handleSplitterMouseDown}
              onTouchStart={this.handleSplitterMouseDown}
            >
              <div className={this.state.splitterCollapseDirectionClass}>
                <div ref={(c) => { this.splitter = c; }} onClick={this.handleCollapse} className={this.state.collapseArrowClass}></div>
              </div>
              {/* <div className="splitter-collapser-left">
                <div ref={(c) => { this.splitter = c; }} onClick={this.handleCollapseLeft} className="triangle-left"></div>
              </div> */}
            </div>
          )
        }
        {wrappedChildren.length > 1 && wrappedChildren[1]}
      </div>
    );
  }
}

SplitterLayout.propTypes = {
  customClassName: PropTypes.string,
  vertical: PropTypes.bool,
  percentage: PropTypes.bool,
  primaryIndex: PropTypes.number,
  primaryMinSize: PropTypes.number,
  secondaryInitialSize: PropTypes.number,
  secondaryMinSize: PropTypes.number,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onSecondaryPaneSizeChange: PropTypes.func,
  children: PropTypes.arrayOf(PropTypes.node)
};

SplitterLayout.defaultProps = {
  customClassName: '',
  vertical: false,
  percentage: false,
  primaryIndex: 0,
  primaryMinSize: 0,
  secondaryInitialSize: undefined,
  secondaryMinSize: 0,
  onDragStart: null,
  onDragEnd: null,
  onSecondaryPaneSizeChange: null,
  children: [],
  splitterCollapseDirection: 'right'
};

export default SplitterLayout;
