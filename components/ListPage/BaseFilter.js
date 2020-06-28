import { useState } from 'react';
import { Paper } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import cx from 'clsx';
import BaseFilterOption from './BaseFilterOption';

const useStyles = makeStyles(theme => ({
  title: {
    fontSize: 12,
    lineHeight: '20px',
    color: theme.palette.secondary[300],
    padding: `${theme.spacing(1)}px 18px 0`,

    [theme.breakpoints.up('md')]: {
      fontSize: 14,
      paddingTop: theme.spacing(1.5),
      borderBottom: `1px solid ${theme.palette.secondary[100]}`,
    },
    '&:last-of-type': {
      borderBottom: 0,
    },
  },
  body: {
    margin: 0,
    padding: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.secondary[100]}`,
    '& > *': {
      margin: theme.spacing(0.5),
    },
    '&:last-child': {
      borderBottom: 0,
    },
  },
  placeholder: {
    alignSelf: 'center',
    padding: '4px 10px',
    margin: 4,
  },
  expand: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  control: {
    padding: 0,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    backgroundColor: 'inherit',
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: theme.palette.secondary[300],
    '&:hover': {
      color: theme.palette.secondary[500],
    },
    '&.active': {
      color: theme.palette.primary[500],
    },
  },
  dropdown: {
    position: 'absolute',
    left: -24,
    top: 36,
    padding: 10,
    minWidth: 300,
    width: '20%',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
  },
  dropdownOptions: {
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
  },
}));

/**
 * One row of filter in <Filters>.
 * Designed to add 2 grid cells in <Filters>'s grid.
 *
 * @param {string} props.title
 * @param {string?} props.placeholder - Shown when no options are selected
 * @param {boolean?} props.expandable - Makes options collapsible on desktop.
 *   Turning this on also hides filters not selected on desktop.
 * @param {Array<string>} props.selected - Selected option values
 * @param {Array<{value: string, label:string}>} props.options
 * @param {(selected: string[]) => void} props.onChange
 */
function BaseFilter({
  title,
  onChange = () => null,
  placeholder,
  expandable,
  selected = [],
  options = [],
}) {
  const classes = useStyles();
  const [expand, setExpand] = useState(false);

  // Note: this is implemented using JS, don't use it on places
  // that is going to cause flicker on page load!
  const isDesktop = useMediaQuery(theme => theme.breakpoints.up('md'));

  const isValueSelected = Object.fromEntries(
    selected.map(value => [value, true])
  );
  const isExpandable = expandable && isDesktop;

  const handleOptionClicked = value => {
    if (isValueSelected[value]) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange(selected.concat(value));
    }
  };

  return (
    <>
      <dt className={classes.title}>
        {isExpandable ? (
          <div className={classes.expand}>
            <button
              className={cx(classes.control, expand && 'active')}
              type="button"
              onClick={() => setExpand(e => !e)}
              data-ga="FilterExpandButton"
            >
              {title}
              {expand ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </button>
            {expand && (
              <Paper className={classes.dropdown} elevation={3}>
                <div className={classes.dropdownOptions}>
                  {options.map(option => (
                    <BaseFilterOption
                      key={option.value}
                      selected={isValueSelected[option.value]}
                      label={option.label}
                      value={option.value}
                      onClick={handleOptionClicked}
                      chip
                    />
                  ))}
                </div>
              </Paper>
            )}
          </div>
        ) : (
          title
        )}
      </dt>
      <dd className={classes.body}>
        {placeholder && selected.length === 0 ? (
          <div className={classes.placeholder}>{placeholder}</div>
        ) : (
          options
            .filter(option =>
              // Only show selected items when BaseFilter is expandable
              isExpandable ? isValueSelected[option.value] : true
            )
            .map(option => (
              <BaseFilterOption
                key={option.value}
                label={option.label}
                value={option.value}
                selected={isValueSelected[option.value]}
                onClick={handleOptionClicked}
              />
            ))
        )}
      </dd>
    </>
  );
}

export default BaseFilter;
