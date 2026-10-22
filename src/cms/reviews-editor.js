export function createReviewsEditor({ data, getDraft, changed, refresh }) {
  const list = document.getElementById('review-list');
  const add = document.getElementById('add-review');
  const node = (tag, text) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function render() {
    const reviews = getDraft().reviews;
    list.replaceChildren();
    document.getElementById('review-editor-count').textContent = reviews.length + ' / 60 reviews';
    if (!reviews.length)
      list.append(
        node(
          'p',
          'No customer reviews yet. Sample cards appear only in your private preview; the public section stays hidden until you publish a visible review.'
        )
      );
    reviews.forEach((review, index) => {
      const row = node('fieldset');
      row.className = 'review-editor-row';
      row.append(node('legend', 'Review ' + (index + 1)));
      const field = (label, input) => {
        const wrap = node('label', label);
        wrap.append(input);
        row.append(wrap);
        return input;
      };
      const product = field('Product', node('select'));
      for (const p of data.products) {
        const option = node('option', p.name);
        option.value = p.key;
        product.append(option);
      }
      product.value = review.product;
      product.onchange = () => {
        review.product = product.value;
        changed();
        refresh();
      };
      const name = field('Customer display name', node('input'));
      name.value = review.name;
      name.maxLength = 80;
      name.required = true;
      name.oninput = () => {
        review.name = name.value;
        changed();
      };
      name.onchange = refresh;
      const rating = field('Star rating', node('select'));
      for (let value = 1; value <= 5; value++) {
        const option = node('option', value + (value === 1 ? ' star' : ' stars'));
        option.value = String(value);
        rating.append(option);
      }
      rating.value = String(review.rating);
      rating.onchange = () => {
        review.rating = Number(rating.value);
        changed();
        refresh();
      };
      const message = field('Customer’s exact review (up to 800 characters)', node('textarea'));
      message.value = review.message;
      message.maxLength = 800;
      message.required = true;
      message.oninput = () => {
        review.message = message.value;
        changed();
      };
      message.onchange = refresh;
      const visible = node('input');
      visible.type = 'checkbox';
      visible.checked = review.visible;
      const visibleLabel = node('label', 'Show this review after publishing');
      visibleLabel.className = 'check';
      visibleLabel.append(visible);
      row.append(visibleLabel);
      visible.onchange = () => {
        review.visible = visible.checked;
        changed();
        refresh();
      };
      const actions = node('div');
      actions.className = 'actions';
      const action = (title, callback) => {
        const button = node('button', title);
        button.type = 'button';
        button.onclick = () => {
          callback();
          changed();
          render();
          refresh();
        };
        actions.append(button);
      };
      if (index > 0)
        action('Move up', () => {
          [reviews[index - 1], reviews[index]] = [reviews[index], reviews[index - 1]];
        });
      if (index < reviews.length - 1)
        action('Move down', () => {
          [reviews[index + 1], reviews[index]] = [reviews[index], reviews[index + 1]];
        });
      action('Remove review', () => {
        reviews.splice(index, 1);
      });
      row.append(actions);
      list.append(row);
    });
  }
  add.onclick = () => {
    if (getDraft().reviews.length >= 60) return;
    getDraft().reviews.push({
      product: data.products[0].key,
      name: '',
      rating: 5,
      message: '',
      visible: false
    });
    changed();
    render();
  };
  return { render };
}
